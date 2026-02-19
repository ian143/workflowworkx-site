import { inngest } from "./client";
import { db } from "@/lib/db";
import { callClaude } from "@/lib/ai/client";
import { buildScoutPrompt, SCOUT_SYSTEM_PROMPT } from "@/lib/ai/prompts/scout";
import { getValidAccessToken } from "@/lib/cloud-auth";
import { downloadFile as downloadGoogleFile } from "@/lib/google-drive";
import { downloadFile as downloadOneDriveFile } from "@/lib/onedrive";
import { extractText } from "@/lib/ingestion/pipeline";
import type { FileType } from "@/lib/ingestion/pipeline";

export const ingestFiles = inngest.createFunction(
  { id: "ingest-files", name: "Ingest Project Files" },
  { event: "glueos/ingest-files" },
  async ({ event, step }) => {
    const { projectId, pipelineItemId, userId } = event.data;

    // Step 1: Download files from cloud drive and extract text
    await step.run("extract-text", async () => {
      const projectFiles = await db.projectFile.findMany({
        where: { projectId },
      });

      for (const file of projectFiles) {
        if (file.extractedText) continue;
        if (file.fileType === "image") continue;
        if (!file.cloudFileId || !file.cloudProvider) continue;

        const accessToken = await getValidAccessToken(userId, file.cloudProvider);

        const buffer =
          file.cloudProvider === "google_drive"
            ? await downloadGoogleFile(accessToken, file.cloudFileId)
            : await downloadOneDriveFile(accessToken, file.cloudFileId);

        const text = await extractText(buffer, file.fileType as FileType);

        await db.projectFile.update({
          where: { id: file.id },
          data: { extractedText: text, lastSyncedAt: new Date() },
        });
      }
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
