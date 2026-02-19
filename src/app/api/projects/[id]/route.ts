import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSession } from "@/lib/require-subscription";
import { extractFolderIdFromUrl } from "@/lib/google-drive";
import { getValidAccessToken } from "@/lib/cloud-auth";
import { resolveShareLink } from "@/lib/onedrive";
import type { CloudProvider } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireActiveSession();
  if (error) return error;
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const { sourceFolderUrl, sourceFolderProvider } = body;

  if (!sourceFolderUrl || !sourceFolderProvider) {
    return NextResponse.json(
      { error: "Folder URL and provider are required" },
      { status: 400 }
    );
  }

  let sourceFolderId: string | null = null;

  if (sourceFolderProvider === "google_drive") {
    sourceFolderId = extractFolderIdFromUrl(sourceFolderUrl);
    if (!sourceFolderId) {
      return NextResponse.json(
        { error: "Could not extract folder ID from Google Drive URL" },
        { status: 400 }
      );
    }
  } else if (sourceFolderProvider === "onedrive") {
    // For OneDrive, resolve the sharing link to get the item ID
    const accessToken = await getValidAccessToken(
      session.user.id,
      "onedrive" as CloudProvider
    );
    sourceFolderId = await resolveShareLink(accessToken, sourceFolderUrl);
    if (!sourceFolderId) {
      return NextResponse.json(
        { error: "Could not resolve OneDrive folder from the provided URL" },
        { status: 400 }
      );
    }
  }

  const updated = await db.project.update({
    where: { id },
    data: {
      sourceFolderUrl,
      sourceFolderProvider,
      sourceFolderId,
    },
  });

  return NextResponse.json(updated);
}
