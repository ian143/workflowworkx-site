import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireActiveSession();
  if (error) return error;
  const { id } = await params;

  const spark = await db.spark.findFirst({
    where: { id },
    include: {
      pipelineItem: { select: { userId: true } },
    },
  });

  if (!spark || spark.pipelineItem.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.spark.update({
    where: { id },
    data: { status: "rejected" },
  });

  return NextResponse.json(updated);
}
