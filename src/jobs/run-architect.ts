import { inngest } from "./client";
import { db } from "@/lib/db";
import { callClaude } from "@/lib/ai/client";
import {
  buildArchitectPrompt,
  ARCHITECT_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/architect";

export const runArchitect = inngest.createFunction(
  { id: "run-architect", name: "Generate Strategic Sparks" },
  { event: "glueos/run-architect" },
  async ({ event, step }) => {
    const { pipelineItemId, userId } = event.data;

    const sparks = await step.run("generate-sparks", async () => {
      const pipelineItem = await db.pipelineItem.findUniqueOrThrow({
        where: { id: pipelineItemId },
      });

      if (!pipelineItem.forensicBrief) {
        throw new Error("No forensic brief found for this pipeline item");
      }

      const vault = await db.identityVault.findUnique({
        where: { userId },
      });

      const vaultContext = vault
        ? JSON.stringify(vault.vaultData)
        : "No identity vault configured.";

      const project = await db.project.findFirst({
        where: {
          pipelineItems: { some: { id: pipelineItemId } },
        },
      });

      const prompt = buildArchitectPrompt(
        vaultContext,
        pipelineItem.forensicBrief,
        project?.name ?? "Unknown Project"
      );
      const response = await callClaude(
        prompt,
        ARCHITECT_SYSTEM_PROMPT,
        2000
      );

      // Parse the 5 sparks from the response
      const lines = response.text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .filter((l) => /^\d+[\.\):]/.test(l) || l.startsWith("-") || l.startsWith("*"))
        .map((l) => l.replace(/^\d+[\.\):]\s*/, "").replace(/^[-*]\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((l) => l.length > 0 && l.split(/\s+/).length <= 12)
        .slice(0, 5);

      return lines;
    });

    await step.run("save-sparks", async () => {
      for (let i = 0; i < sparks.length; i++) {
        await db.spark.create({
          data: {
            pipelineItemId,
            sparkText: sparks[i],
            sortOrder: i + 1,
          },
        });
      }

      await db.pipelineItem.update({
        where: { id: pipelineItemId },
        data: { status: "sparks_generated" },
      });
    });

    return { sparkCount: sparks.length };
  }
);
