import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../lib/logger";
import { gardenFrequencies, gardenPropertyTypes, gardenServiceOptions } from "../../../lib/gardenCleaners";
import type { GardenQuotePayload } from "../../../lib/gardenContracts";
import { createServerClient } from "@ftc/supabase";

export const runtime = "edge";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_LIMIT_ENABLED = process.env.NODE_ENV === "production";
const PROPERTY_TYPE_VALUES = new Set(gardenPropertyTypes);
const SERVICE_VALUES = new Set(gardenServiceOptions);
const FREQUENCY_VALUES = new Set(gardenFrequencies);
const DEFAULT_ADMIN_EMAILS = [
  "hello@unalabs.cloud",
  "fejiro.efiuvwere@gmail.com",
  "mike.fejiro@gmail.com",
  "uby400@gmail.com"
];

type QuotePayload = Partial<Record<keyof GardenQuotePayload, unknown>>;

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

function normalizePortalEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function parseAdminEmails(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => normalizePortalEmail(item))
    .filter(Boolean);
}

function getAdminEmailSet(): Set<string> {
  return new Set([...DEFAULT_ADMIN_EMAILS, ...parseAdminEmails(process.env.NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS)]);
}

function hasMissingAddOnsColumn(error: unknown): boolean {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";
  return /add_ons/i.test(message) && /column/i.test(message);
}

async function resolveAuthenticatedEmail(req: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerClient(req.headers);
    const { data, error } = await (supabase.auth as any).getUser();
    if (error || !data.user?.email) {
      return null;
    }
    return normalizePortalEmail(data.user.email);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const callerEmail = await resolveAuthenticatedEmail(req);
  if (!callerEmail) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admins = getAdminEmailSet();
  if (!admins.has(callerEmail)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = normalizeText(searchParams.get("status") || "").toLowerCase();
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 100)));

  try {
    const supabase = createServerClient(req.headers);
    let query = supabase
      .from("garden_cleaners_quotes")
      .select("id,email,address,city,region,service_type,service_frequency,property_type,status,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, quotes: data || [] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load quotes" },
      { status: 500 }
    );
  }
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
  const address = normalizeText(payload.address);
  const city = normalizeText(payload.city);
  const postalCode = normalizeText(payload.postalCode);
  const propertyType = normalizeText(payload.propertyType);
  const serviceNeeded = normalizeText(payload.serviceNeeded);
  const preferredDate = normalizeText(payload.preferredDate);
  const preferredTime = normalizeText(payload.preferredTime);
  const frequency = normalizeText(payload.frequency);
  const region = normalizeText(payload.region);
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
  if (address.length < 5 || address.length > 160) {
    return badRequest("Please provide a valid service address.");
  }
  if (city.length < 2 || city.length > 80) {
    return badRequest("Please provide a valid city.");
  }
  if (postalCode.length > 20) {
    return badRequest("Please provide a valid postal code.");
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
  if (region.length > 80) {
    return badRequest("Please select a valid service region.");
  }
  if (!preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return badRequest("Please select a valid preferred date.");
  }
  if (preferredTime.length > 60) {
    return badRequest("Please select a valid preferred time.");
  }
  if (message.length < 20 || message.length > 2000) {
    return badRequest("Please provide a concise message (20-2000 characters).");
  }
  if (!Number.isFinite(startedAtValue) || Date.now() - startedAtValue < 800) {
    return badRequest("Submission flagged as automated. Please retry.", 422);
  }

  const addOnsRaw = payload.addOns;
  const addOns = Array.isArray(addOnsRaw) ? (addOnsRaw as unknown[]).filter((v): v is string => typeof v === 'string').slice(0, 10) : [];

  // Prepare fields for garden_cleaners_quotes
  const quoteRecord = {
    name: fullName,
    email,
    phone,
    address,
    city,
    region: region || "Unspecified",
    postal_code: postalCode,
    property_type: propertyType,
    service_type: serviceNeeded,
    service_frequency: frequency,
    preferred_date: preferredDate,
    preferred_time: preferredTime || null,
    message,
    add_ons: addOns.length > 0 ? addOns : null,
    status: "new",
    source: "garden_cleaners_quote_form",
    raw_payload: payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Insert into Supabase
  let supabaseError: unknown = null;
  try {
    const supabase = createServerClient();
    let { error } = await supabase.from("garden_cleaners_quotes").insert([quoteRecord]);
    if (error && hasMissingAddOnsColumn(error)) {
      const { add_ons: _addOns, ...quoteRecordWithoutAddOns } = quoteRecord;
      void _addOns;
      ({ error } = await supabase.from("garden_cleaners_quotes").insert([quoteRecordWithoutAddOns]));
    }
    if (error) {
      supabaseError = error;
      logger.error('garden_cleaners_quote_supabase_error', { message: error.message });
    }
  } catch (err) {
    supabaseError = err;
    logger.error('garden_cleaners_quote_supabase_error', { message: err instanceof Error ? err.message : 'unknown' });
  }
  if (supabaseError) {
    return NextResponse.json({ ok: false, message: 'Failed to persist quote. Please try again later.' }, { status: 500 });
  }

  logger.info('garden_cleaners_quote_received', { source: quoteRecord.source, name: quoteRecord.name, email: quoteRecord.email, region: quoteRecord.region, property_type: quoteRecord.property_type, service_type: quoteRecord.service_type, service_frequency: quoteRecord.service_frequency });

  // Admin email notification via Resend (optional — configure RESEND_API_KEY + GARDEN_CLEANERS_ADMIN_EMAIL)
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.GARDEN_CLEANERS_ADMIN_EMAIL || 'uby400@gmail.com';
  if (resendApiKey) {
    try {
      const addOnsList = Array.isArray(payload.addOns) && (payload.addOns as string[]).length > 0
        ? (payload.addOns as string[]).join(', ')
        : 'None';
      const emailBody = [
        `New quote request from ${fullName}`,
        ``,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Address: ${address}, ${city} ${postalCode}`,
        `Property: ${propertyType}`,
        `Service: ${serviceNeeded}`,
        `Frequency: ${frequency}`,
        `Date: ${preferredDate}${preferredTime ? ` (${preferredTime})` : ''}`,
        `Add-ons: ${addOnsList}`,
        `Region: ${region || 'Unspecified'}`,
        ``,
        `Message:`,
        message,
      ].join('\n');
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Garden Cleaners <noreply@gardencleaners.ca>',
          to: [adminEmail],
          subject: `New quote request — ${fullName} (${serviceNeeded})`,
          text: emailBody,
        }),
      });
    } catch (emailErr) {
      logger.warn('garden_cleaners_quote_admin_email_failed', { message: emailErr instanceof Error ? emailErr.message : 'unknown' });
    }
  }

  // Optional webhook forwarding (secondary notification)
  const webhookUrl = process.env.GARDEN_CLEANERS_QUOTE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-ftc-source': 'garden-cleaners-subsite' },
        body: JSON.stringify({ type: 'garden_cleaners_quote', quote: quoteRecord })
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

