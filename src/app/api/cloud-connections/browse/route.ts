import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/require-subscription";
import { getValidAccessToken } from "@/lib/cloud-auth";
import { listFolders as listGoogleFolders } from "@/lib/google-drive";
import { listFolders as listOneDriveFolders } from "@/lib/onedrive";
import type { CloudProvider } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await requireActiveSession();
  if (error) return error;

  const provider = req.nextUrl.searchParams.get("provider") as CloudProvider | null;
  const parentId = req.nextUrl.searchParams.get("parentId") || "root";

  if (!provider || !["google_drive", "onedrive"].includes(provider)) {
    return NextResponse.json(
      { error: "Valid provider is required (google_drive or onedrive)" },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getValidAccessToken(session.user.id, provider);

    const folders =
      provider === "google_drive"
        ? await listGoogleFolders(accessToken, parentId)
        : await listOneDriveFolders(accessToken, parentId);

    return NextResponse.json({ folders });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to browse folders";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
