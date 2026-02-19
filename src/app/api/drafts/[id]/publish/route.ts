import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishTextPost } from "@/lib/linkedin";
import { requireActiveSession } from "@/lib/require-subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireActiveSession();
  if (error) return error;
  const { id } = await params;

  const draft = await db.postDraft.findFirst({
    where: {
      id,
      spark: { pipelineItem: { userId: session.user.id } },
    },
  });

  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const linkedinPostId = await publishTextPost(session.user.id, draft.content);

  const updated = await db.postDraft.update({
    where: { id },
    data: {
      status: "published",
      publishedAt: new Date(),
      linkedinPostId,
    },
  });

  // Update pipeline item status
  const spark = await db.spark.findUnique({
    where: { id: draft.sparkId },
  });
  if (spark) {
    await db.pipelineItem.update({
      where: { id: spark.pipelineItemId },
      data: { status: "published" },
    });
  }

  return NextResponse.json(updated);
}
