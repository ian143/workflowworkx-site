import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { inngest } from "@/jobs/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    include: { files: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Allow ingest even with 0 files if a cloud folder is linked
  // (the ingest job will auto-discover files from the folder)
  if (project.files.length === 0 && !project.sourceFolderId) {
    return NextResponse.json(
      { error: "No files to ingest and no cloud folder linked" },
      { status: 400 }
    );
  }

  // Create pipeline item
  const pipelineItem = await db.pipelineItem.create({
    data: {
      userId: session.user.id,
      projectId: project.id,
      status: "scouting",
    },
  });

  // Update project status
  await db.project.update({
    where: { id: project.id },
    data: { status: "processing" },
  });

  // Trigger Inngest job
  await inngest.send({
    name: "glueos/ingest-files",
    data: {
      projectId: project.id,
      pipelineItemId: pipelineItem.id,
      userId: session.user.id,
    },
  });

  return NextResponse.json(pipelineItem, { status: 201 });
}
