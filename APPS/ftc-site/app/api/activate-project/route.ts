import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function getStripe(): InstanceType<typeof Stripe> | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    httpClient: Stripe.createFetchHttpClient()
  });
}

function sanitize(value: unknown, maxLen = 500): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

type WorkflowRun = {
  intake_id: string;
  email: string;
  plan: string;
  payment_status: "paid";
  session_id: string;
  created_at: string;
  intake?: Record<string, unknown>;
};

async function sendNotification(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ftc-source": "ftc-site",
        "x-unalabs-source": "unalabs-site"
      },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sessionId = sanitize(body.session_id);
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required." }, { status: 400 });
  }

  // Verify payment with Stripe
  const stripe = getStripe();
  let email = "";
  let plan = "";
  let intakeId = "";

  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return NextResponse.json({ error: "Payment not completed." }, { status: 402 });
      }
      email = session.customer_email ?? sanitize(session.metadata?.email);
      plan = session.metadata?.plan ?? "";
      intakeId = session.metadata?.intake_id ?? "";
    } catch {
      return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
    }
  } else {
    // Stripe not configured — derive from intake data (dev/test only)
    const intake = body.intake as Record<string, unknown> | null;
    email = sanitize(intake?.email);
    plan = "unknown";
    intakeId = sanitize(intake?.intakeId ?? intake?.intake_id);
  }

  // Build WorkflowRun
  const workflowRun: WorkflowRun = {
    intake_id: intakeId,
    email,
    plan,
    payment_status: "paid",
    session_id: sessionId,
    created_at: new Date().toISOString(),
    intake: body.intake as Record<string, unknown> | undefined
  };

  // Send admin notification
  const adminWebhookUrl = process.env.UNALABS_NEW_PROJECT_WEBHOOK_URL;
  if (adminWebhookUrl) {
    await sendNotification(adminWebhookUrl, {
      type: "una_new_project_activation",
      workflowRun
    });
  }

  // Send client confirmation email
  const clientWebhookUrl = process.env.UNALABS_PROJECT_CONFIRMATION_EMAIL_WEBHOOK_URL
    ?? process.env.UNALABS_CONFIRMATION_EMAIL_WEBHOOK_URL;
  if (clientWebhookUrl && email) {
    await sendNotification(clientWebhookUrl, {
      type: "una_project_confirmation_email",
      email,
      plan,
      intake_id: intakeId,
      session_id: sessionId,
      intake: workflowRun.intake
    });
  }

  return NextResponse.json({ ok: true, workflow_run: workflowRun });
}
