import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { createStripeCustomer } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);

  const stripeCustomer = await createStripeCustomer(email, name);

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
      stripeCustomerId: stripeCustomer.id,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
