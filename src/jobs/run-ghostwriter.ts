import { inngest } from "./client";
import { db } from "@/lib/db";
import { callClaudeJSON } from "@/lib/ai/client";
import {
  buildGhostwriterPrompt,
  GHOSTWRITER_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/ghostwriter";
import { runPolyesterTest } from "@/lib/ai/polyester-test";

interface GhostwriterOutput {
  short_post: string;
  medium_post: string;
  long_post: string;
  scores: { short: number; medium: number; long: number };
  scenario_used: string;
  carousel_slides: Array<{
    slide_number: number;
    headline: string;
    content: string;
  }>;
}

export const runGhostwriter = inngest.createFunction(
  { id: "run-ghostwriter", name: "Generate Post Drafts" },
  { event: "glueos/run-ghostwriter" },
  async ({ event, step }) => {
    const { sparkId, pipelineItemId, userId } = event.data;

    const output = await step.run("generate-drafts", async () => {
      const spark = await db.spark.findUniqueOrThrow({
        where: { id: sparkId },
      });

      const pipelineItem = await db.pipelineItem.findUniqueOrThrow({
        where: { id: pipelineItemId },
      });

      const vault = await db.identityVault.findUnique({
        where: { userId },
      });

      const vaultData = vault?.vaultData as Record<string, unknown> | undefined;
      const vaultContext = vault
        ? JSON.stringify(vaultData)
        : "No identity vault configured.";

      const prompt = buildGhostwriterPrompt(
        vaultContext,
        spark.sparkText,
        pipelineItem.forensicBrief ?? ""
      );

      return callClaudeJSON<GhostwriterOutput>(
        prompt,
        GHOSTWRITER_SYSTEM_PROMPT,
        6000
      );
    });

    await step.run("save-drafts", async () => {
      const vault = await db.identityVault.findUnique({
        where: { userId },
      });

      const vaultData = vault?.vaultData as {
        voice_dna?: { banned_words?: string[]; ai_slop_triggers?: string[] };
        content_strategy?: { length_in_characters?: Record<string, number> };
      } | undefined;

      const draftsToCreate = [
        {
          lengthType: "short" as const,
          content: output.short_post,
          aiScore: output.scores.short,
        },
        {
          lengthType: "medium" as const,
          content: output.medium_post,
          aiScore: output.scores.medium,
        },
        {
          lengthType: "long" as const,
          content: output.long_post,
          aiScore: output.scores.long,
        },
      ];

      for (const draft of draftsToCreate) {
        const lengthConfig = vaultData?.content_strategy?.length_in_characters;
        const targetLength = lengthConfig
          ? {
              min: (lengthConfig[draft.lengthType] ?? 700) * 0.8,
              max: (lengthConfig[draft.lengthType] ?? 2200) * 1.2,
            }
          : undefined;

        const testResult = runPolyesterTest(draft.content, {
          targetLength,
          bannedWords: vaultData?.voice_dna?.banned_words,
          slopTriggers: vaultData?.voice_dna?.ai_slop_triggers,
        });

        const postDraft = await db.postDraft.create({
          data: {
            sparkId,
            lengthType: draft.lengthType,
            content: draft.content,
            score: testResult.overallScore,
          },
        });

        // Save carousel slides for each draft
        if (output.carousel_slides?.length > 0) {
          for (const slide of output.carousel_slides) {
            await db.carouselSlide.create({
              data: {
                postDraftId: postDraft.id,
                slideNumber: slide.slide_number,
                headline: slide.headline,
                content: slide.content,
              },
            });
          }
        }
      }

      // Update spark status
      await db.spark.update({
        where: { id: sparkId },
        data: { status: "drafted" },
      });

      // Check if all approved sparks are now drafted
      const pipelineSparks = await db.spark.findMany({
        where: { pipelineItemId },
      });

      const allDrafted = pipelineSparks
        .filter((s) => s.status === "approved" || s.status === "drafted")
        .every((s) => s.status === "drafted");

      if (allDrafted) {
        await db.pipelineItem.update({
          where: { id: pipelineItemId },
          data: { status: "ready" },
        });
      }
    });

    return { success: true };
  }
);
