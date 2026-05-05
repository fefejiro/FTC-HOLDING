import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../lib/logger";
import { createServerClient } from "@ftc/supabase";

export const runtime = "edge";

const DEFAULT_CORS_ORIGIN = "https://www.ogtradesacademy.com";
const EXTRA_DEFAULT_ORIGINS = [
  "https://ogtradesacademy.com"
];

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
  "live-trading",
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
  phone?: unknown;
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function aliases(...pairs: Array<[string, string]>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of pairs) {
    out.set(key, value);
    out.set(slugify(key), value);
  }
  return out;
}

const INTEREST_ALIASES = aliases(
  ["8 week beginner forex course", "8-week-beginner-forex-course"],
  ["course", "8-week-beginner-forex-course"],
  ["community", "community-access"],
  ["community access", "community-access"],
  ["resources", "free-resources"],
  ["free resources", "free-resources"],
  ["not sure", "not-sure-yet"],
  ["not sure yet", "not-sure-yet"]
);

const EXPERIENCE_ALIASES = aliases(
  ["brand new", "brand-new"],
  ["learning basics", "learning-basics"],
  ["demo trading", "demo-trading"],
  ["live trading", "live-trading"],
  ["prop firm focused", "prop-firm-focused"]
);

const GOAL_ALIASES = aliases(
  ["build foundation", "build-foundation"],
  ["improve risk management", "improve-risk-management"],
  ["learn a repeatable strategy", "learn-a-repeatable-strategy"],
  ["gain consistency", "gain-consistency"]
);

const TIMELINE_ALIASES = aliases(
  ["ready now", "ready-now"],
  ["this month", "this-month"],
  ["next month", "next-month"],
  ["just looking", "just-looking"],
  ["exploring", "just-looking"]
);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseAllowedOriginsEnv(): Set<string> {
  const value = process.env.OG_TRADES_ALLOWED_ORIGINS || "";
  const envOrigins = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return new Set<string>([DEFAULT_CORS_ORIGIN, ...EXTRA_DEFAULT_ORIGINS, ...envOrigins]);
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = parseAllowedOriginsEnv();
  if (allowed.has(origin)) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host.endsWith(".squarespace.com") || host.endsWith(".squarespace.net");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin: string = isAllowedOrigin(origin) && origin ? origin : DEFAULT_CORS_ORIGIN;
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
    "vary": "origin"
  };
}

function badRequest(message: string, status = 400, origin: string | null = null) {
  return NextResponse.json({ ok: false, message }, { status, headers: corsHeaders(origin) });
}

function normalizeChoice(
  value: unknown,
  allowedValues: Set<string>,
  aliasMap: Map<string, string>,
  fallback: string
): string {
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return fallback;
  if (allowedValues.has(raw)) return raw;
  const rawSlug = slugify(raw);
  if (allowedValues.has(rawSlug)) return rawSlug;
  const aliasMatch = aliasMap.get(raw) || aliasMap.get(rawSlug);
  if (aliasMatch && allowedValues.has(aliasMatch)) return aliasMatch;
  return fallback;
}

function pullField(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return obj[key];
    }
  }
  return undefined;
}

function parseFormEntry(value: FormDataEntryValue | null): unknown {
  if (typeof value === "string") return value;
  return "";
}

async function parsePayload(req: NextRequest): Promise<LeadPayload> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    return (await req.json()) as LeadPayload;
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    return {
      name: parseFormEntry(formData.get("name")) || parseFormEntry(formData.get("Name")),
      email: parseFormEntry(formData.get("email")) || parseFormEntry(formData.get("Email")),
      phone: parseFormEntry(formData.get("phone")) || parseFormEntry(formData.get("Phone")),
      interest: parseFormEntry(formData.get("interest")) || parseFormEntry(formData.get("Interest")),
      experienceLevel:
        parseFormEntry(formData.get("experienceLevel")) ||
        parseFormEntry(formData.get("experience")) ||
        parseFormEntry(formData.get("Experience")),
      primaryGoal:
        parseFormEntry(formData.get("primaryGoal")) ||
        parseFormEntry(formData.get("goal")) ||
        parseFormEntry(formData.get("Goal")),
      timeline: parseFormEntry(formData.get("timeline")) || parseFormEntry(formData.get("Timeline")),
      notes:
        parseFormEntry(formData.get("notes")) ||
        parseFormEntry(formData.get("message")) ||
        parseFormEntry(formData.get("Message")),
      website: parseFormEntry(formData.get("website")),
      startedAt: parseFormEntry(formData.get("startedAt"))
    };
  }

  const fallback = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    name: pullField(fallback, ["name", "Name"]),
    email: pullField(fallback, ["email", "Email"]),
    phone: pullField(fallback, ["phone", "Phone"]),
    interest: pullField(fallback, ["interest", "Interest"]),
    experienceLevel: pullField(fallback, ["experienceLevel", "experience", "Experience"]),
    primaryGoal: pullField(fallback, ["primaryGoal", "goal", "Goal"]),
    timeline: pullField(fallback, ["timeline", "Timeline"]),
    notes: pullField(fallback, ["notes", "message", "Message"]),
    website: pullField(fallback, ["website"]),
    startedAt: pullField(fallback, ["startedAt"])
  };
}

function makeRequestId() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OGT-${ymd}-${rand}`;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  let payload: LeadPayload;

  try {
    payload = await parsePayload(req);
  } catch {
    return badRequest("Invalid request payload.", 400, origin);
  }

  const name = normalizeText(payload.name);
  const email = normalizeEmail(payload.email);
  const phone = normalizeText(payload.phone);
  const interest = normalizeChoice(payload.interest, INTEREST_VALUES, INTEREST_ALIASES, "not-sure-yet");
  const experienceLevel = normalizeChoice(payload.experienceLevel, EXPERIENCE_VALUES, EXPERIENCE_ALIASES, "brand-new");
  const primaryGoal = normalizeChoice(payload.primaryGoal, GOAL_VALUES, GOAL_ALIASES, "build-foundation");
  const timeline = normalizeChoice(payload.timeline, TIMELINE_VALUES, TIMELINE_ALIASES, "just-looking");
  const notes = normalizeText(payload.notes);
  const website = normalizeText(payload.website);
  const startedAt = Number(payload.startedAt || 0);

  // Silent honeypot success to absorb bot traffic.
  if (website.length > 0) {
    return NextResponse.json(
      { ok: true, message: "Thanks, your request has been received." },
      { status: 202, headers: corsHeaders(origin) }
    );
  }

  if (name.length < 2 || name.length > 80) {
    return badRequest("Please provide a valid name.", 400, origin);
  }

  if (!isValidEmail(email) || email.length > 120) {
    return badRequest("Please provide a valid email address.", 400, origin);
  }

  if (!INTEREST_VALUES.has(interest)) {
    return badRequest("Please select a valid interest.", 400, origin);
  }

  if (!EXPERIENCE_VALUES.has(experienceLevel)) {
    return badRequest("Please select a valid experience level.", 400, origin);
  }

  if (!GOAL_VALUES.has(primaryGoal)) {
    return badRequest("Please select a valid primary goal.", 400, origin);
  }

  if (!TIMELINE_VALUES.has(timeline)) {
    return badRequest("Please select a valid timeline.", 400, origin);
  }

  if (notes.length > 1200) {
    return badRequest("Please keep your notes under 1200 characters.", 400, origin);
  }

  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 800) {
    return badRequest("Submission flagged as automated. Please retry.", 422, origin);
  }

  const lead = {
    requestId: makeRequestId(),
    source: "og-trades-academy",
    receivedAt: new Date().toISOString(),
    name,
    email,
    phone,
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

  // Insert into Supabase
  let supabaseError: unknown = null;
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("og_trades_leads").insert([
      {
        name,
        email,
        phone: phone || null,
        interest,
        experience_level: experienceLevel,
        primary_goal: primaryGoal,
        timeline,
        message: notes || null,
        status: "new",
        source: "og_trades_enrollment_form",
        raw_payload: lead
      }
    ]);
    if (error) {
      supabaseError = error;
      logger.error("og_trades_lead_supabase_error", { message: error.message });
    }
  } catch (err) {
    supabaseError = err;
    logger.error("og_trades_lead_supabase_error", {
      message: err instanceof Error ? err.message : "unknown"
    });
  }

  // Continue with webhook calls as optional fallback
  let webhookSent = false;
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

      webhookSent = response.ok;
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
      ok: !supabaseError,
      message: supabaseError
        ? "Request received but storage failed. Please try again."
        : "Request received. OG_Trades Academy will follow up with next steps.",
      requestId: lead.requestId,
      confirmationSent: confirmationSent || undefined
    },
    { status: supabaseError ? 500 : 200, headers: corsHeaders(origin) }
  );
}
