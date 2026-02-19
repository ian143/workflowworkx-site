import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeOneDriveCode, getOneDriveUserEmail } from "@/lib/onedrive";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=no_code", req.url)
    );
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/onedrive/callback`;
    const tokens = await exchangeOneDriveCode(code, redirectUri);

    const email = await getOneDriveUserEmail(tokens.accessToken);

    await db.cloudConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: "onedrive",
        },
      },
      create: {
        userId: session.user.id,
        provider: "onedrive",
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
      new URL("/dashboard/settings?cloud=onedrive_connected", req.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=onedrive_auth_failed", req.url)
    );
  }
}
