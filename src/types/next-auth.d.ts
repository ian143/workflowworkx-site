import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscriptionStatus: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    subscriptionStatus: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionStatus: string;
  }
}
