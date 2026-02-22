import { inngest } from "./client";
import { db } from "@/lib/db";
import { callClaude } from "@/lib/ai/client";
import { buildScoutPrompt, SCOUT_SYSTEM_PROMPT } from "@/lib/ai/prompts/scout";
import { getValidAccessToken } from "@/lib/cloud-auth";
import {
  downloadFile as downloadGoogleFile,
  listFolderFilesRecursive as listGoogleFilesRecursive,
} from "@/lib/google-drive";
import {
  downloadFile as downloadOneDriveFile,
  listFolderFilesRecursive as listOneDriveFilesRecursive,
} from "@/lib/onedrive";
import { extractText } from "@/lib/ingestion/pipeline";
import type { FileType } from "@/lib/ingestion/pipeline";

const MIME_TO_FILE_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
};

export const ingestFiles = inngest.createFunction(
  { id: "ingest-files", name: "Ingest Project Files" },
  { event: "glueos/ingest-files" },
  async ({ event, step }) => {
    const { projectId, pipelineItemId, userId } = event.data;

    // Step 0: Auto-discover files from cloud folder (if linked)
    await step.run("discover-files", async () => {
      const project = await db.project.findUniqueOrThrow({
        where: { id: projectId },
      });

      if (!project.sourceFolderId || !project.sourceFolderProvider) return;

      const accessToken = await getValidAccessToken(
        userId,
        project.sourceFolderProvider
      );

      const cloudFiles =
        project.sourceFolderProvider === "google_drive"
          ? await listGoogleFilesRecursive(accessToken, project.sourceFolderId)
          : await listOneDriveFilesRecursive(accessToken, project.sourceFolderId);

      for (const file of cloudFiles) {
        const fileType = MIME_TO_FILE_TYPE[file.mimeType];
        if (!fileType) continue;

        await db.projectFile.upsert({
          where: {
            projectId_cloudFileId_cloudProvider: {
              projectId,
              cloudFileId: file.id,
              cloudProvider: project.sourceFolderProvider,
            },
          },
          create: {
            projectId,
            fileName: file.name,
            fileType: fileType as "pdf" | "docx" | "pptx" | "txt" | "image",
            mimeType: file.mimeType,
            cloudFileId: file.id,
            cloudProvider: project.sourceFolderProvider,
            fileSizeBytes: file.size || 0,
          },
          update: {
            fileName: file.name,
            fileSizeBytes: file.size || 0,
          },
        });
      }
    });

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
