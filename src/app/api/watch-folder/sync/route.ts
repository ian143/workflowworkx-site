import { NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/require-subscription";
import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/cloud-auth";
import { listFolders as listGoogleFolders } from "@/lib/google-drive";
import { listFolders as listOneDriveFolders } from "@/lib/onedrive";

export async function GET() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      watchFolderId: true,
      watchFolderProvider: true,
    },
  });

  if (!user?.watchFolderId || !user?.watchFolderProvider) {
    return NextResponse.json(
      { error: "No watch folder configured. Set one in Settings." },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getValidAccessToken(
      session.user.id,
      user.watchFolderProvider
    );

    const subfolders =
      user.watchFolderProvider === "google_drive"
        ? await listGoogleFolders(accessToken, user.watchFolderId)
        : await listOneDriveFolders(accessToken, user.watchFolderId);

    // Get existing projects for this user that are linked to cloud folders
    const existingProjects = await db.project.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        sourceFolderId: true,
        status: true,
        _count: { select: { files: true } },
      },
    });

    const existingFolderIds = new Set(
      existingProjects
        .filter((p) => p.sourceFolderId)
        .map((p) => p.sourceFolderId)
    );

    const folders = subfolders.map((folder) => {
      const existingProject = existingProjects.find(
        (p) => p.sourceFolderId === folder.id
      );
      return {
        id: folder.id,
        name: folder.name,
        isProject: existingFolderIds.has(folder.id),
        projectId: existingProject?.id ?? null,
        projectStatus: existingProject?.status ?? null,
        fileCount: existingProject?._count.files ?? 0,
      };
    });

    return NextResponse.json({ folders });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to scan watch folder";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
