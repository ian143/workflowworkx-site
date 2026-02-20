import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeGoogleCode, getGoogleUserEmail } from "@/lib/google-drive";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as { id?: string }).id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=no_code", req.url)
    );
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google-drive/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);

    const email = await getGoogleUserEmail(tokens.accessToken);

    const userId = (session.user as { id: string }).id;

    await db.cloudConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider: "google_drive",
        },
      },
      create: {
        userId,
        provider: "google_drive",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        accountEmail: email,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        accountEmail: email,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard/settings?cloud=google_connected", req.url)
    );
  } catch (err) {
    console.error("Google Drive OAuth callback failed:", err);
    const reason = err instanceof Error ? err.message : "unknown_error";
    const encoded = encodeURIComponent(reason);
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=google_auth_failed&reason=${encoded}`, req.url)
    );
  }
}
