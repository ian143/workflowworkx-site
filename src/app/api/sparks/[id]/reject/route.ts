import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
      pipelineItem: { select: { userId: true } },
    },
  });

  if (!spark || spark.pipelineItem.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.spark.update({
    where: { id: params.id },
    data: { status: "rejected" },
  });

  return NextResponse.json(updated);
}
