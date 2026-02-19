import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";

export async function GET() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const vault = await db.identityVault.findUnique({
    where: { userId: session.user.id },
  });

  if (!vault) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(vault);
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireActiveSession();
  if (error) return error;

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
