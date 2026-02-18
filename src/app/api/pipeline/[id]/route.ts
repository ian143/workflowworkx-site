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
