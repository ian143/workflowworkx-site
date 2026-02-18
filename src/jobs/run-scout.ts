import { inngest } from "./client";
import { db } from "@/lib/db";
import { callClaude } from "@/lib/ai/client";
import { buildScoutPrompt, SCOUT_SYSTEM_PROMPT } from "@/lib/ai/prompts/scout";

export const runScout = inngest.createFunction(
  { id: "run-scout", name: "Run Forensic Scout Analysis" },
  { event: "glueos/run-scout" },
  async ({ event, step }) => {
    const { pipelineItemId, userId } = event.data;

    const forensicBrief = await step.run("scout-analysis", async () => {
      const pipelineItem = await db.pipelineItem.findUniqueOrThrow({
        where: { id: pipelineItemId },
        include: { project: { include: { files: true } } },
      });

      const vault = await db.identityVault.findUnique({
        where: { userId },
      });

      const vaultContext = vault
        ? JSON.stringify(vault.vaultData)
        : "No identity vault configured.";

      const filesForPrompt = pipelineItem.project.files
        .filter((f) => f.extractedText)
        .map((f) => ({ fileName: f.fileName, content: f.extractedText! }));

      const prompt = buildScoutPrompt(vaultContext, pipelineItem.project.name, filesForPrompt);
      const response = await callClaude(prompt, SCOUT_SYSTEM_PROMPT, 4000);
      return response.text;
    });

    await step.run("save-brief", async () => {
      await db.pipelineItem.update({
        where: { id: pipelineItemId },
        data: { forensicBrief, status: "sparks_generated" },
      });
    });

    return { forensicBrief };
  }
);
