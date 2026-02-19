import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const draft = await db.postDraft.findFirst({
    where: {
      id: params.id,
      spark: { pipelineItem: { userId: session.user.id } },
    },
    include: {
      spark: {
        include: {
          pipelineItem: {
            include: { project: { select: { name: true } } },
          },
        },
      },
      carouselSlides: { orderBy: { slideNumber: "asc" } },
    },
  });

  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(draft);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const draft = await db.postDraft.findFirst({
    where: {
      id: params.id,
      spark: { pipelineItem: { userId: session.user.id } },
    },
  });

  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { content } = await req.json();

  const updated = await db.postDraft.update({
    where: { id: params.id },
    data: { content },
  });

  return NextResponse.json(updated);
}
