import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/api/vault/:path*", "/api/projects/:path*", "/api/pipeline/:path*", "/api/sparks/:path*", "/api/drafts/:path*"],
};
