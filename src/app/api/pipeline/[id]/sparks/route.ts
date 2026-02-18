import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await db.pipelineItem.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sparks = await db.spark.findMany({
    where: { pipelineItemId: params.id },
    include: {
      pipelineItem: {
        include: { project: { select: { name: true } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(sparks);
}
