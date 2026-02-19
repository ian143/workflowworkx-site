import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleDriveAuthUrl } from "@/lib/google-drive";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google-drive/callback`;
  const url = getGoogleDriveAuthUrl(redirectUri);

  return NextResponse.json({ url });
}
