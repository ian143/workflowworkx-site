import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";

export async function GET() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { files: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const { name } = await req.json();

  if (!name) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const project = await db.project.create({
    data: {
      userId: session.user.id,
      name,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
