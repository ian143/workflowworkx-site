import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";
import { inngest } from "@/jobs/client";

export async function GET() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { files: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const { name, sourceFolderId, sourceFolderProvider } = await req.json();

  if (!name) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const project = await db.project.create({
    data: {
      userId: session.user.id,
      name,
      ...(sourceFolderId && sourceFolderProvider
        ? { sourceFolderId, sourceFolderProvider }
        : {}),
    },
  });

  // Auto-trigger pipeline when a cloud folder is linked
  if (sourceFolderId && sourceFolderProvider) {
    const pipelineItem = await db.pipelineItem.create({
      data: {
        userId: session.user.id,
        projectId: project.id,
        status: "scouting",
      },
    });

    await db.project.update({
      where: { id: project.id },
      data: { status: "processing" },
    });

    await inngest.send({
      name: "glueos/ingest-files",
      data: {
        projectId: project.id,
        pipelineItemId: pipelineItem.id,
        userId: session.user.id,
      },
    });
  }

  return NextResponse.json(project, { status: 201 });
}
