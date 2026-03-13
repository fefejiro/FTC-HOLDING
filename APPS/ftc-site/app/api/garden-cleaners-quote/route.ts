import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../lib/logger";
import { gardenFrequencies, gardenPropertyTypes, gardenServiceOptions } from "../../../lib/gardenCleaners";

export const runtime = "edge";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const PROPERTY_TYPE_VALUES = new Set(gardenPropertyTypes);
const SERVICE_VALUES = new Set(gardenServiceOptions);
const FREQUENCY_VALUES = new Set(gardenFrequencies);

type QuotePayload = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  propertyType?: unknown;
  serviceNeeded?: unknown;
  preferredDate?: unknown;
  frequency?: unknown;
  message?: unknown;
  website?: unknown;
  startedAt?: unknown;
};

type RateLimitStore = Map<string, number[]>;

function getRateLimitStore(): RateLimitStore {
  const key = "__garden_cleaners_quote_rate_limit_store__";
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
  const header = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "anonymous";
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
  const propertyType = normalizeText(payload.propertyType);
  const serviceNeeded = normalizeText(payload.serviceNeeded);
  const preferredDate = normalizeText(payload.preferredDate);
  const frequency = normalizeText(payload.frequency);
  const message = normalizeText(payload.message);
  const website = normalizeText(payload.website);
  const startedAtValue = Number(payload.startedAt || 0);

  if (website.length > 0) {
    return NextResponse.json({ ok: true, message: "Thanks, your quote request has been received." }, { status: 202 });
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
  if (!PROPERTY_TYPE_VALUES.has(propertyType as (typeof gardenPropertyTypes)[number])) {
    return badRequest("Please select a valid property type.");
  }
  if (!SERVICE_VALUES.has(serviceNeeded)) {
    return badRequest("Please select a valid service.");
  }
  if (!FREQUENCY_VALUES.has(frequency as (typeof gardenFrequencies)[number])) {
    return badRequest("Please select a valid frequency.");
  }
  if (!preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return badRequest("Please select a valid preferred date.");
  }
  if (message.length < 20 || message.length > 2000) {
    return badRequest("Please provide a concise message (20-2000 characters).");
  }
  if (!Number.isFinite(startedAtValue) || Date.now() - startedAtValue < 800) {
    return badRequest("Submission flagged as automated. Please retry.", 422);
  }

  const lead = {
    source: 'garden-cleaners-subsite',
    receivedAt: new Date().toISOString(),
    clientKey,
    fullName,
    email,
    phone,
    propertyType,
    serviceNeeded,
    preferredDate,
    frequency,
    message
  };

  logger.info('garden_cleaners_quote_received', { source: lead.source, receivedAt: lead.receivedAt, clientKey: lead.clientKey, propertyType: lead.propertyType, serviceNeeded: lead.serviceNeeded, frequency: lead.frequency });

  const webhookUrl = process.env.GARDEN_CLEANERS_QUOTE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-ftc-source': 'garden-cleaners-subsite' },
        body: JSON.stringify({ type: 'garden_cleaners_quote', lead })
      });
      if (!webhookResponse.ok) {
        logger.warn('garden_cleaners_quote_webhook_failed', { status: webhookResponse.status });
      }
    } catch (error) {
      logger.error('garden_cleaners_quote_webhook_error', { message: error instanceof Error ? error.message : 'unknown' });
    }
  }

  return NextResponse.json({ ok: true, message: 'Thanks. Garden Cleaners received your quote request and will follow up with the next step.' }, { status: 200 });
}
