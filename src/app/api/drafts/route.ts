import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
