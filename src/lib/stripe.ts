import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export async function createCheckoutSession(
  customerId: string,
  userEmail: string,
  options?: { includeSetup?: boolean }
) {
  const includeSetup = options?.includeSetup ?? true;

  const lineItems: { price: string; quantity: number }[] = [];

  if (includeSetup) {
    lineItems.push({
      price: process.env.STRIPE_PRICE_ID_SETUP!,
      quantity: 1,
    });
  }

  lineItems.push({
    price: process.env.STRIPE_PRICE_ID_MONTHLY!,
    quantity: 1,
  });

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?setup=complete`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/settings?cancelled=true`,
    metadata: {
      userEmail,
    },
  });

  return session;
}

export async function createStripeCustomer(email: string, name?: string) {
  return stripe.customers.create({
    email,
    name: name ?? undefined,
  });
}
