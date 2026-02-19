import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";

export async function GET() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const drafts = await db.postDraft.findMany({
    where: {
      spark: {
        pipelineItem: { userId: session.user.id },
      },
    },
    include: {
      spark: {
        include: {
          pipelineItem: {
            include: { project: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(drafts);
}
