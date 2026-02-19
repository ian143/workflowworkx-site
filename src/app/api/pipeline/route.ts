import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";

export async function GET() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

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
