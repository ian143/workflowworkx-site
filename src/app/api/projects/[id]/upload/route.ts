import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const FILE_TYPE_MAP: Record<string, string> = {
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
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files");
  const created = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;

    const fileType = FILE_TYPE_MAP[file.type];
    if (!fileType) continue;

    // Store file content as base64 for now (production would use Vercel Blob)
    const buffer = Buffer.from(await file.arrayBuffer());
    const storageKey = `projects/${project.id}/${Date.now()}-${file.name}`;

    const record = await db.projectFile.create({
      data: {
        projectId: project.id,
        fileName: file.name,
        fileType: fileType as "pdf" | "docx" | "pptx" | "txt" | "image",
        mimeType: file.type,
        storageKey,
        fileSizeBytes: buffer.length,
      },
    });

    created.push(record);
  }

  return NextResponse.json(created, { status: 201 });
}
