import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../lib/logger";
import {
  polarServiceOptions,
  polarShipmentTypes,
  polarTimelineOptions
} from "../../../lib/polarAnchor";

export const runtime = "edge";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_LIMIT_ENABLED = process.env.NODE_ENV === "production";
const SERVICE_VALUES = new Set(polarServiceOptions);
const SHIPMENT_TYPE_VALUES = new Set(polarShipmentTypes);
const TIMELINE_VALUES = new Set(polarTimelineOptions);

type QuotePayload = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  companyName?: unknown;
  shipmentType?: unknown;
  serviceNeeded?: unknown;
  origin?: unknown;
  destination?: unknown;
  preferredDate?: unknown;
  preferredTimeline?: unknown;
  message?: unknown;
  website?: unknown;
  startedAt?: unknown;
};

type RateLimitStore = Map<string, number[]>;

function getRateLimitStore(): RateLimitStore {
  const key = "__polar_anchor_quote_rate_limit_store__";
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
  if (RATE_LIMIT_ENABLED && isRateLimited(clientKey)) {
    return badRequest("Too many quote attempts. Please try again later.", 429);
  }

  let payload: QuotePayload;
  try {
    payload = (await req.json()) as QuotePayload;
  } catch {
    return badRequest("Invalid request payload.");
  }

  const fullName = normalizeText(payload.fullName);
  const email = normalizeEmail(payload.email);
  const phone = normalizeText(payload.phone);
  const companyName = normalizeText(payload.companyName);
  const shipmentType = normalizeText(payload.shipmentType);
  const serviceNeeded = normalizeText(payload.serviceNeeded);
  const origin = normalizeText(payload.origin);
  const destination = normalizeText(payload.destination);
  const preferredDate = normalizeText(payload.preferredDate);
  const preferredTimeline = normalizeText(payload.preferredTimeline);
  const message = normalizeText(payload.message);
  const website = normalizeText(payload.website);
  const startedAtValue = Number(payload.startedAt || 0);

  if (website.length > 0) {
    return NextResponse.json(
      { ok: true, message: "Thanks, your quote request has been received." },
      { status: 202 }
    );
  }
  if (fullName.length < 2 || fullName.length > 100) {
    return badRequest("Please provide a valid full name.");
  }
  if (!isValidEmail(email) || email.length > 120) {
    return badRequest("Please provide a valid email address.");
  }
  if (phone.length < 7 || phone.length > 40) {
    return badRequest("Please provide a valid phone number.");
  }
  if (companyName.length < 2 || companyName.length > 140) {
    return badRequest("Please provide a valid company name.");
  }
  if (!SHIPMENT_TYPE_VALUES.has(shipmentType as (typeof polarShipmentTypes)[number])) {
    return badRequest("Please select a valid shipment type.");
  }
  if (!SERVICE_VALUES.has(serviceNeeded)) {
    return badRequest("Please select a valid service.");
  }
  if (origin.length < 2 || origin.length > 120) {
    return badRequest("Please provide a valid origin.");
  }
  if (destination.length < 2 || destination.length > 120) {
    return badRequest("Please provide a valid destination.");
  }
  if (!preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return badRequest("Please select a valid preferred date.");
  }
  if (!TIMELINE_VALUES.has(preferredTimeline as (typeof polarTimelineOptions)[number])) {
    return badRequest("Please select a valid preferred timeline.");
  }
  if (message.length < 20 || message.length > 2000) {
    return badRequest("Please provide a concise message (20-2000 characters).");
  }
  if (!Number.isFinite(startedAtValue) || Date.now() - startedAtValue < 800) {
    return badRequest("Submission flagged as automated. Please retry.", 422);
  }

  const lead = {
    source: "polar-anchor-site",
    receivedAt: new Date().toISOString(),
    clientKey,
    fullName,
    email,
    phone,
    companyName,
    shipmentType,
    serviceNeeded,
    origin,
    destination,
    preferredDate,
    preferredTimeline,
    message
  };

  logger.info("polar_anchor_quote_received", {
    source: lead.source,
    receivedAt: lead.receivedAt,
    clientKey: lead.clientKey,
    shipmentType: lead.shipmentType,
    serviceNeeded: lead.serviceNeeded,
    preferredTimeline: lead.preferredTimeline
  });

  const webhookUrl = process.env.POLAR_ANCHOR_QUOTE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ftc-source": "polar-anchor-site" },
        body: JSON.stringify({ type: "polar_anchor_quote", lead })
      });
      if (!webhookResponse.ok) {
        logger.warn("polar_anchor_quote_webhook_failed", { status: webhookResponse.status });
      }
    } catch (error) {
      logger.error("polar_anchor_quote_webhook_error", {
        message: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Thanks. Polar Anchor received your quote request and will follow up with the right next step."
    },
    { status: 200 }
  );
}
