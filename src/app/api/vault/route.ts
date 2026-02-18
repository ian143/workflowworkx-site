import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vault = await db.identityVault.findUnique({
    where: { userId: session.user.id },
  });

  if (!vault) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(vault);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaultData = await req.json();

  const vault = await db.identityVault.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      vaultData,
    },
    update: {
      vaultData,
      version: { increment: 1 },
    },
  });

  return NextResponse.json(vault);
}
