import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../lib/logger";

export const runtime = "edge";

const BUDGET_VALUES = new Set(["under-5k", "5k-15k", "15k-50k", "50k-plus"]);
const TIMELINE_VALUES = new Set(["2-6-weeks", "6-12-weeks", "12-weeks-plus"]);
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

type IntakePayload = {
  name?: unknown;
  email?: unknown;
  projectIdea?: unknown;
  budgetRange?: unknown;
  timeline?: unknown;
  companyWebsite?: unknown;
  startedAt?: unknown;
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

  const name = normalizeText(payload.name);
  const email = normalizeEmail(payload.email);
  const projectIdea = normalizeText(payload.projectIdea);
  const budgetRange = normalizeText(payload.budgetRange);
  const timeline = normalizeText(payload.timeline);
  const companyWebsite = normalizeText(payload.companyWebsite);
  const startedAtValue = Number(payload.startedAt || 0);

  // Honeypot field intentionally accepts silently to reduce bot noise.
  if (companyWebsite.length > 0) {
    return NextResponse.json({ ok: true, message: "Thanks, your intake has been received." }, { status: 202 });
  }

  if (name.length < 2 || name.length > 80) {
    return badRequest("Please provide a valid name.");
  }

  if (!isValidEmail(email) || email.length > 120) {
    return badRequest("Please provide a valid email address.");
  }

  if (projectIdea.length < 20 || projectIdea.length > 2000) {
    return badRequest("Please provide a concise project summary (20-2000 characters).");
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
    source: "ftc-site",
    receivedAt: new Date().toISOString(),
    clientKey,
    name,
    email,
    projectIdea,
    budgetRange,
    timeline
  };

  logger.info("intake_submission_received", {
    source: lead.source,
    receivedAt: lead.receivedAt,
    clientKey: lead.clientKey,
    budgetRange: lead.budgetRange,
    timeline: lead.timeline
  });

  const webhookUrl = process.env.FTC_INTAKE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ftc-source": "ftc-site"
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

  return NextResponse.json(
    {
      ok: true,
      message: "Thanks. FTC received your intake and will respond with a scoped next step."
    },
    { status: 200 }
  );
}

