import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Always allow settings page (so users can change password / manage subscription)
    if (pathname.startsWith("/dashboard/settings")) {
      return NextResponse.next();
    }

    // Block non-active subscriptions from dashboard and protected API routes.
    // The JWT subscription status may be stale (e.g. after a Stripe webhook),
    // so API routes also check the DB directly as a second layer of defense.
    if (token?.subscriptionStatus !== "active") {
      // For API routes, return 403 JSON
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Active subscription required" },
          { status: 403 }
        );
      }
      // For dashboard pages, redirect to settings with a notice
      return NextResponse.redirect(
        new URL("/dashboard/settings?subscription=inactive", req.url)
      );
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/api/vault/:path*",
    "/api/projects/:path*",
    "/api/pipeline/:path*",
    "/api/sparks/:path*",
    "/api/drafts/:path*",
  ],
};
