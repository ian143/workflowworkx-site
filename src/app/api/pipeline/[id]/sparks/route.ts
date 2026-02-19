import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireActiveSession();
  if (error) return error;
  const { id } = await params;

  const item = await db.pipelineItem.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sparks = await db.spark.findMany({
    where: { pipelineItemId: id },
    include: {
      pipelineItem: {
        include: { project: { select: { name: true } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(sparks);
}
