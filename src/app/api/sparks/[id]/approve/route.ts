import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { inngest } from "@/jobs/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spark = await db.spark.findFirst({
    where: { id: params.id },
    include: {
      pipelineItem: { select: { userId: true, id: true } },
    },
  });

  if (!spark || spark.pipelineItem.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.spark.update({
    where: { id: params.id },
    data: { status: "approved" },
  });

  // Trigger Ghostwriter job
  await inngest.send({
    name: "glueos/run-ghostwriter",
    data: {
      sparkId: params.id,
      pipelineItemId: spark.pipelineItemId,
      userId: session.user.id,
    },
  });

  // Update pipeline status
  await db.pipelineItem.update({
    where: { id: spark.pipelineItemId },
    data: { status: "drafting" },
  });

  return NextResponse.json(updated);
}
