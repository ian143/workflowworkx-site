import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { db } from "./db";
import { Session } from "next-auth";

type AuthResult =
  | { session: Session; error: null }
  | { session: null; error: NextResponse };

/**
 * Checks that the user is authenticated AND has an active subscription.
 * Queries the database for the latest subscription status (not the JWT,
 * which may be stale after a Stripe webhook updates the DB).
 */
export async function requireActiveSession(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionStatus: true },
  });

  if (!user || user.subscriptionStatus !== "active") {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}
