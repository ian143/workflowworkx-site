import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/require-subscription";
import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/cloud-auth";
import {
  listFolderFiles as listGoogleFiles,
} from "@/lib/google-drive";
import {
  listFolderFiles as listOneDriveFiles,
} from "@/lib/onedrive";

export async function GET(
  _req: NextRequest,
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

  if (!project.sourceFolderId || !project.sourceFolderProvider) {
    return NextResponse.json(
      { error: "No cloud folder linked to this project" },
      { status: 400 }
    );
  }

  const accessToken = await getValidAccessToken(
    session.user.id,
    project.sourceFolderProvider
  );

  let files;
  if (project.sourceFolderProvider === "google_drive") {
    files = await listGoogleFiles(accessToken, project.sourceFolderId);
  } else {
    files = await listOneDriveFiles(accessToken, project.sourceFolderId);
  }

  return NextResponse.json({ files });
}
