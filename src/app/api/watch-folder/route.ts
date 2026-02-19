import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/require-subscription";
import { db } from "@/lib/db";

export async function GET() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      watchFolderId: true,
      watchFolderProvider: true,
      watchFolderName: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const { folderId, provider, folderName } = await req.json();

  if (!folderId || !provider || !folderName) {
    return NextResponse.json(
      { error: "folderId, provider, and folderName are required" },
      { status: 400 }
    );
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      watchFolderId: folderId,
      watchFolderProvider: provider,
      watchFolderName: folderName,
    },
    select: {
      watchFolderId: true,
      watchFolderProvider: true,
      watchFolderName: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  await db.user.update({
    where: { id: session.user.id },
    data: {
      watchFolderId: null,
      watchFolderProvider: null,
      watchFolderName: null,
    },
  });

  return NextResponse.json({ ok: true });
}
