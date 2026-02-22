import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/require-subscription";
import { db } from "@/lib/db";

const MIME_TO_FILE_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireActiveSession();
  if (error) return error;
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.sourceFolderProvider) {
    return NextResponse.json(
      { error: "No cloud folder linked" },
      { status: 400 }
    );
  }

  const { files } = await req.json();
  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: "No files selected" },
      { status: 400 }
    );
  }

  try {
    const created = [];

    for (const file of files) {
      const fileType = MIME_TO_FILE_TYPE[file.mimeType];
      if (!fileType) continue;

      const record = await db.projectFile.upsert({
        where: {
          projectId_cloudFileId_cloudProvider: {
            projectId: project.id,
            cloudFileId: file.id,
            cloudProvider: project.sourceFolderProvider,
          },
        },
        create: {
          projectId: project.id,
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

      created.push(record);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to save files";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
