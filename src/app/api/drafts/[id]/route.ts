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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
