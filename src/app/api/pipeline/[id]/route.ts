import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const item = await db.pipelineItem.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      project: true,
      sparks: {
        orderBy: { sortOrder: "asc" },
        include: {
          postDrafts: { include: { carouselSlides: true } },
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}
