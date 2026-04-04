import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../lib/logger";

export const runtime = "edge";

const INTEREST_VALUES = new Set([
  "8-week-beginner-forex-course",
  "community-access",
  "free-resources",
  "not-sure-yet"
]);

const EXPERIENCE_VALUES = new Set([
  "brand-new",
  "learning-basics",
  "demo-trading",
  "prop-firm-focused"
]);

const GOAL_VALUES = new Set([
  "build-foundation",
  "improve-risk-management",
  "learn-a-repeatable-strategy",
  "gain-consistency"
]);

const TIMELINE_VALUES = new Set([
  "ready-now",
  "this-month",
  "next-month",
  "just-looking"
]);

type LeadPayload = {
  name?: unknown;
  email?: unknown;
  interest?: unknown;
  experienceLevel?: unknown;
  primaryGoal?: unknown;
  timeline?: unknown;
  notes?: unknown;
  website?: unknown;
  startedAt?: unknown;
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function makeRequestId() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OGT-${ymd}-${rand}`;
}

export async function POST(req: NextRequest) {
  let payload: LeadPayload;

  try {
    payload = (await req.json()) as LeadPayload;
  } catch {
    return badRequest("Invalid request payload.");
  }

  const name = normalizeText(payload.name);
  const email = normalizeEmail(payload.email);
  const interest = normalizeText(payload.interest) || "not-sure-yet";
  const experienceLevel = normalizeText(payload.experienceLevel) || "brand-new";
  const primaryGoal = normalizeText(payload.primaryGoal) || "build-foundation";
  const timeline = normalizeText(payload.timeline) || "just-looking";
  const notes = normalizeText(payload.notes);
  const website = normalizeText(payload.website);
  const startedAt = Number(payload.startedAt || 0);

  // Silent honeypot success to absorb bot traffic.
  if (website.length > 0) {
    return NextResponse.json({ ok: true, message: "Thanks, your request has been received." }, { status: 202 });
  }

  if (name.length < 2 || name.length > 80) {
    return badRequest("Please provide a valid name.");
  }

  if (!isValidEmail(email) || email.length > 120) {
    return badRequest("Please provide a valid email address.");
  }

  if (!INTEREST_VALUES.has(interest)) {
    return badRequest("Please select a valid interest.");
  }

  if (!EXPERIENCE_VALUES.has(experienceLevel)) {
    return badRequest("Please select a valid experience level.");
  }

  if (!GOAL_VALUES.has(primaryGoal)) {
    return badRequest("Please select a valid primary goal.");
  }

  if (!TIMELINE_VALUES.has(timeline)) {
    return badRequest("Please select a valid timeline.");
  }

  if (notes.length > 1200) {
    return badRequest("Please keep your notes under 1200 characters.");
  }

  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 800) {
    return badRequest("Submission flagged as automated. Please retry.", 422);
  }

  const lead = {
    requestId: makeRequestId(),
    source: "og-trades-academy",
    receivedAt: new Date().toISOString(),
    name,
    email,
    interest,
    experienceLevel,
    primaryGoal,
    timeline,
    notes
  };

  logger.info("og_trades_lead_received", {
    requestId: lead.requestId,
    interest: lead.interest,
    experienceLevel: lead.experienceLevel,
    primaryGoal: lead.primaryGoal,
    timeline: lead.timeline
  });

  const webhookUrl = process.env.OG_TRADES_LEADS_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-unalabs-source": "og-trades-academy"
        },
        body: JSON.stringify({
          type: "og_trades_lead",
          lead
        })
      });

      if (!response.ok) {
        logger.warn("og_trades_lead_webhook_failed", {
          status: response.status
        });
      }
    } catch (error) {
      logger.error("og_trades_lead_webhook_error", {
        message: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  let confirmationSent = false;
  const confirmationWebhookUrl = process.env.OG_TRADES_CONFIRMATION_WEBHOOK_URL;
  if (confirmationWebhookUrl) {
    try {
      const response = await fetch(confirmationWebhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-unalabs-source": "og-trades-academy"
        },
        body: JSON.stringify({
          type: "og_trades_confirmation",
          requestId: lead.requestId,
          email: lead.email,
          interest: lead.interest,
          receivedAt: lead.receivedAt
        })
      });
      confirmationSent = response.ok;
      if (!response.ok) {
        logger.warn("og_trades_confirmation_failed", {
          status: response.status
        });
      }
    } catch (error) {
      logger.error("og_trades_confirmation_error", {
        message: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Request received. OG_Trades Academy will follow up with next steps.",
      requestId: lead.requestId,
      confirmationSent: confirmationSent || undefined
    },
    { status: 200 }
  );
}
