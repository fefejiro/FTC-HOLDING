import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Node runtime required — Stripe SDK uses Node APIs not available on edge
export const runtime = "edge";

const PRICE_IDS = {
  full: process.env.STRIPE_PRICE_FULL,
  deposit: process.env.STRIPE_PRICE_DEPOSIT
} as const;

function getStripe(): InstanceType<typeof Stripe> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    httpClient: Stripe.createFetchHttpClient()
  });
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.UNALABS_SITE_URL ||
    "https://unalabs.cloud"
  ).replace(/\/+$/, "");
}

function sanitize(value: unknown, maxLen = 200): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = sanitize((body as Record<string, unknown>).email);
  const plan = sanitize((body as Record<string, unknown>).plan) as "full" | "deposit";
  const intakeId = sanitize((body as Record<string, unknown>).intake_id);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (plan !== "full" && plan !== "deposit") {
    return NextResponse.json({ error: "Plan must be \"full\" or \"deposit\"." }, { status: 400 });
  }

  if (!intakeId) {
    return NextResponse.json({ error: "intake_id is required." }, { status: 400 });
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price ID for plan "${plan}" is not configured.` },
      { status: 500 }
    );
  }

  const siteUrl = getSiteUrl();

  let stripe: InstanceType<typeof Stripe>;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Payment service is not configured." }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: {
        email,
        plan,
        intake_id: intakeId
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
