import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/linkedin";
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

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`;

  const tokens = await exchangeCodeForTokens(code, redirectUri);

  // Fetch LinkedIn user profile to get the user ID
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  const profile = await profileRes.json();

  await db.user.update({
    where: { id: session.user.id },
    data: {
      linkedinAccessToken: tokens.accessToken,
      linkedinRefreshToken: tokens.refreshToken,
      linkedinTokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
      linkedinUserId: profile.sub,
    },
  });

  return NextResponse.redirect(
    new URL("/dashboard/settings?linkedin=connected", req.url)
  );
}
