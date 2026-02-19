import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await db.cloudConnection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      accountEmail: true,
      createdAt: true,
    },
  });

  return NextResponse.json(connections);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await req.json();
  if (!provider) {
    return NextResponse.json({ error: "Provider required" }, { status: 400 });
  }

  await db.cloudConnection.deleteMany({
    where: { userId: session.user.id, provider },
  });

  return NextResponse.json({ ok: true });
}
