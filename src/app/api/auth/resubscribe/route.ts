import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { includeSetup } = await req.json();

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found" },
      { status: 400 }
    );
  }

  if (user.subscriptionStatus === "active") {
    return NextResponse.json(
      { error: "Subscription is already active" },
      { status: 400 }
    );
  }

  const checkoutSession = await createCheckoutSession(
    user.stripeCustomerId,
    user.email,
    { includeSetup: includeSetup === true }
  );

  return NextResponse.json({ url: checkoutSession.url });
}
