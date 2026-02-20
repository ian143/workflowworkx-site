import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { linkedinUserId: true },
  });

  return NextResponse.json({ connected: !!user?.linkedinUserId });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      linkedinAccessToken: null,
      linkedinRefreshToken: null,
      linkedinTokenExpiry: null,
      linkedinUserId: null,
    },
  });

  return NextResponse.json({ disconnected: true });
}
