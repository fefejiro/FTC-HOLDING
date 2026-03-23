import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../lib/logger";

export const runtime = "edge";

const BUDGET_VALUES = new Set([
  "0-1000",
  "1000-2500",
  "2500-5000",
  "5000-10000",
  "10000-plus",
  "not-sure-yet"
]);
const TIMELINE_VALUES = new Set([
  "",
  "2-4-weeks",
  "4-8-weeks",
  "8-12-weeks",
  "12-weeks-plus"
]);
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

type IntakePayload = {
  name?: unknown;
  email?: unknown;
  projectName?: unknown;
  projectType?: unknown;
  projectIdea?: unknown;
  budgetRange?: unknown;
  timeline?: unknown;
  notes?: unknown;
  companyWebsite?: unknown;
  startedAt?: unknown;
  ateamDemo?: unknown;
};

type RateLimitStore = Map<string, number[]>;

function getRateLimitStore(): RateLimitStore {
  const key = "__ftc_intake_rate_limit_store__";
  const g = globalThis as typeof globalThis & { [x: string]: RateLimitStore | undefined };
  if (!g[key]) {
    g[key] = new Map<string, number[]>();
  }
  return g[key] as RateLimitStore;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientKey(req: NextRequest): string {
  const header =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for") ||
    "anonymous";
  return header.split(",")[0].trim().toLowerCase() || "anonymous";
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const store = getRateLimitStore();
  const existing = store.get(clientKey) || [];
  const kept = existing.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  kept.push(now);
  store.set(clientKey, kept);
  return kept.length > MAX_REQUESTS_PER_WINDOW;
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function makeRequestId(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `UL-${ymd}-${rand}`;
}

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req);
  if (isRateLimited(clientKey)) {
    return badRequest("Too many intake attempts. Please try again later.", 429);
  }

  let payload: IntakePayload;
  try {
    payload = (await req.json()) as IntakePayload;
  } catch {
    return badRequest("Invalid request payload.");
  }

  const providedName = normalizeText(payload.name);
  const name = providedName || "Website lead";
  const email = normalizeEmail(payload.email);
  const projectName = normalizeText(payload.projectName);
  const projectType = normalizeText(payload.projectType) || "Not sure yet";
  const projectIdea = normalizeText(payload.projectIdea);
  const budgetRange = normalizeText(payload.budgetRange);
  const timeline = normalizeText(payload.timeline);
  const notes = normalizeText(payload.notes);
  const companyWebsite = normalizeText(payload.companyWebsite);
  const startedAtValue = Number(payload.startedAt || 0);
  const ateamDemo = payload.ateamDemo ?? null;

  // Honeypot field intentionally accepts silently to reduce bot noise.
  if (companyWebsite.length > 0) {
    return NextResponse.json({ ok: true, message: "Thanks, your intake has been received." }, { status: 202 });
  }

  if (providedName.length > 0 && (providedName.length < 2 || providedName.length > 80)) {
    return badRequest("Please provide a valid name.");
  }

  if (!isValidEmail(email) || email.length > 120) {
    return badRequest("Please provide a valid email address.");
  }

  if (projectName.length > 140) {
    return badRequest("Please keep the company or project name under 140 characters.");
  }

  if (projectType.length < 2 || projectType.length > 120) {
    return badRequest("Please provide a valid project type.");
  }

  if (projectIdea.length < 20 || projectIdea.length > 2000) {
    return badRequest("Please provide a concise project summary (20-2000 characters).");
  }

  if (notes.length > 1200) {
    return badRequest("Optional notes should stay under 1200 characters.");
  }

  if (!BUDGET_VALUES.has(budgetRange)) {
    return badRequest("Please select a valid budget range.");
  }

  if (!TIMELINE_VALUES.has(timeline)) {
    return badRequest("Please select a valid timeline.");
  }

  if (!Number.isFinite(startedAtValue) || Date.now() - startedAtValue < 800) {
    return badRequest("Submission flagged as automated. Please retry.", 422);
  }

  const lead = {
    requestId: makeRequestId(),
    source: "ftc-site",
    receivedAt: new Date().toISOString(),
    clientKey,
    name,
    email,
    projectName,
    projectType,
    projectIdea,
    budgetRange,
    timeline,
    notes,
    ateamDemo
  };

  logger.info("intake_submission_received", {
    source: lead.source,
    receivedAt: lead.receivedAt,
    requestId: lead.requestId,
    clientKey: lead.clientKey,
    budgetRange: lead.budgetRange,
    timeline: lead.timeline,
    projectType: lead.projectType,
    ateamAttached: Boolean(ateamDemo)
  });

  const webhookUrl =
    process.env.UNALABS_INTAKE_WEBHOOK_URL || process.env.FTC_INTAKE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ftc-source": "ftc-site",
          "x-unalabs-source": "unalabs-site"
        },
        body: JSON.stringify({
          type: "ftc_intake_submission",
          lead
        })
      });

      if (!webhookResponse.ok) {
        logger.warn("intake_webhook_failed", {
          status: webhookResponse.status
        });
      }
    } catch (error) {
      logger.error("intake_webhook_error", {
        message: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  let confirmationSent = false;
  const confirmationWebhookUrl = process.env.UNALABS_CONFIRMATION_EMAIL_WEBHOOK_URL;
  if (confirmationWebhookUrl) {
    try {
      const emailResponse = await fetch(confirmationWebhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ftc-source": "ftc-site",
          "x-unalabs-source": "unalabs-site"
        },
        body: JSON.stringify({
          type: "ftc_intake_confirmation_email",
          requestId: lead.requestId,
          email: lead.email,
          summary: lead.projectIdea,
          projectType: lead.projectType,
          receivedAt: lead.receivedAt
        })
      });
      confirmationSent = emailResponse.ok;
      if (!emailResponse.ok) {
        logger.warn("intake_confirmation_email_failed", {
          status: emailResponse.status
        });
      }
    } catch (error) {
      logger.error("intake_confirmation_email_error", {
        message: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        "Request received. Una Labs has your setup brief and will respond with a scoped next step.",
      requestId: lead.requestId,
      confirmationSent: confirmationSent || undefined
    },
    { status: 200 }
  );
}
