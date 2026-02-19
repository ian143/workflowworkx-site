import { inngest } from "./client";
import { db } from "@/lib/db";
import { callClaude } from "@/lib/ai/client";
import { buildScoutPrompt, SCOUT_SYSTEM_PROMPT } from "@/lib/ai/prompts/scout";

export const ingestFiles = inngest.createFunction(
  { id: "ingest-files", name: "Ingest Project Files" },
  { event: "glueos/ingest-files" },
  async ({ event, step }) => {
    const { projectId, pipelineItemId, userId } = event.data;

    // Step 1: Extract text from all files (placeholder for Vercel Blob integration)
    await step.run("extract-text", async () => {
      const projectFiles = await db.projectFile.findMany({
        where: { projectId },
      });

      for (const file of projectFiles) {
        if (file.extractedText) continue;
        if (file.fileType === "image") continue;
        // In production, fetch from Vercel Blob/S3 using file.storageKey
        // and run extractText() from the ingestion pipeline
      }

      return projectFiles;
    });

    // Step 2: Run Scout (Forensic Analysis)
    const forensicBrief = await step.run("run-scout", async () => {
      const projectFiles = await db.projectFile.findMany({
        where: { projectId },
      });

      const hasText = projectFiles.some((f) => f.extractedText);
      if (!hasText) {
        return "No extractable text found in project files.";
      }

      const vault = await db.identityVault.findUnique({
        where: { userId },
      });

      const vaultContext = vault
        ? JSON.stringify(vault.vaultData)
        : "No identity vault configured.";

      const project = await db.project.findUniqueOrThrow({
        where: { id: projectId },
      });

      const filesForPrompt = projectFiles
        .filter((f) => f.extractedText)
        .map((f) => ({ fileName: f.fileName, content: f.extractedText! }));

      const prompt = buildScoutPrompt(vaultContext, project.name, filesForPrompt);
      const response = await callClaude(prompt, SCOUT_SYSTEM_PROMPT, 4000);
      return response.text;
    });

    // Step 3: Update pipeline item with forensic brief
    await step.run("update-pipeline", async () => {
      await db.pipelineItem.update({
        where: { id: pipelineItemId },
        data: {
          forensicBrief,
          status: "sparks_generated",
        },
      });

      await db.project.update({
        where: { id: projectId },
        data: { status: "ready" },
      });
    });

    // Step 4: Trigger Architect (Spark Generation)
    await step.sendEvent("trigger-architect", {
      name: "glueos/run-architect",
      data: { pipelineItemId, userId },
    });

    return { success: true, pipelineItemId };
  }
);
