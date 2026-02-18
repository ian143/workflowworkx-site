import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishTextPost } from "@/lib/linkedin";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const draft = await db.postDraft.findFirst({
    where: {
      id: params.id,
      spark: { pipelineItem: { userId: session.user.id } },
    },
  });

  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const linkedinPostId = await publishTextPost(session.user.id, draft.content);

  const updated = await db.postDraft.update({
    where: { id: params.id },
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
