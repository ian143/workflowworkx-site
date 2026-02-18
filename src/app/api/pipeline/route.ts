import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.pipelineItem.findMany({
    where: { userId: session.user.id },
    include: {
      project: { select: { name: true } },
      _count: { select: { sparks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}
