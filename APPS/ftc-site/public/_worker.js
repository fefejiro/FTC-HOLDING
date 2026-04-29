const GARDEN_HOSTS = new Set([
  "gardencleaners.ca",
  "www.gardencleaners.ca",
  "gardencleaners.pages.dev"
]);

const OG_HOSTS = new Set([
  "ogtradesacademy.com",
  "www.ogtradesacademy.com",
  "ogtradesacademy.ca",
  "www.ogtradesacademy.ca",
  "og.unalabs.cloud",
  "og-trades-pages.pages.dev"
]);

const GARDEN_PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/services",
  "/contact",
  "/quote",
  "/portal"
]);

const OG_PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/course",
  "/community",
  "/resources",
  "/contact"
]);

const ROLE_ROUTE_PATTERN = /^\/(?:garden-cleaners\/)?(?:customer|worker|cleaner|admin|operator|dashboard|jobs|bookings|status|login)(?:\/|$)/;

const PROPERTY_TYPES = new Set(["House", "Condo / Apartment", "Office", "Retail / Commercial", "Vacant unit", "Other"]);
const SERVICE_OPTIONS = new Set([
  "Residential Cleaning",
  "Commercial Cleaning",
  "Deep Cleaning",
  "Move In / Move Out Cleaning",
  "Post Construction Cleaning",
  "Recurring Cleaning",
  "Office Cleaning"
]);
const FREQUENCIES = new Set(["One-time", "Weekly", "Bi-weekly", "Monthly", "Custom schedule"]);
const REGIONS = new Set(["Oshawa", "Whitby", "Ajax", "Pickering", "Courtice", "Durham Region"]);

function hostFrom(request) {
  return String(request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function normalizePath(pathname) {
  const value = `/${String(pathname || "/").replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return value || "/";
}

function gardenAssetPath(pathname) {
  const normalized = normalizePath(pathname);
  if (normalized.startsWith("/garden-cleaners")) {
    return normalized;
  }
  if (GARDEN_PUBLIC_PATHS.has(normalized)) {
    return normalized === "/" ? "/garden-cleaners" : `/garden-cleaners${normalized}`;
  }
  return null;
}

function ogAssetPath(pathname) {
  const normalized = normalizePath(pathname);
  if (normalized.startsWith("/og-trades-academy")) {
    return normalized;
  }
  if (OG_PUBLIC_PATHS.has(normalized)) {
    return normalized === "/" ? "/og-trades-academy" : `/og-trades-academy${normalized}`;
  }
  return null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clientKey(request) {
  return String(request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for") || "anonymous")
    .split(",")[0]
    .trim()
    .toLowerCase() || "anonymous";
}

function validateQuote(payload, request) {
  const fullName = normalizeText(payload.fullName);
  const email = normalizeEmail(payload.email);
  const phone = normalizeText(payload.phone);
  const propertyType = normalizeText(payload.propertyType);
  const serviceNeeded = normalizeText(payload.serviceNeeded);
  const preferredDate = normalizeText(payload.preferredDate);
  const frequency = normalizeText(payload.frequency);
  const message = normalizeText(payload.message);
  const website = normalizeText(payload.website);
  const region = normalizeText(payload.region);
  const startedAt = Number(payload.startedAt || 0);

  if (website.length > 0) {
    return { honeypot: true };
  }
  if (fullName.length < 2 || fullName.length > 100) return { error: "Please provide a valid full name.", status: 400 };
  if (!isValidEmail(email) || email.length > 120) return { error: "Please provide a valid email address.", status: 400 };
  if (phone.length < 7 || phone.length > 40) return { error: "Please provide a valid phone number.", status: 400 };
  if (!PROPERTY_TYPES.has(propertyType)) return { error: "Please select a valid property type.", status: 400 };
  if (!SERVICE_OPTIONS.has(serviceNeeded)) return { error: "Please select a valid service.", status: 400 };
  if (!FREQUENCIES.has(frequency)) return { error: "Please select a valid frequency.", status: 400 };
  if (!preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) return { error: "Please select a valid preferred date.", status: 400 };
  if (message.length < 20 || message.length > 2000) return { error: "Please provide a concise message (20-2000 characters).", status: 400 };
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 800) return { error: "Submission flagged as automated. Please retry.", status: 422 };
  if (region && !REGIONS.has(region)) return { error: "Please select a valid service region.", status: 400 };

  return {
    lead: {
      source: "garden-cleaners-subsite",
      receivedAt: new Date().toISOString(),
      clientKey: clientKey(request),
      fullName,
      email,
      phone,
      propertyType,
      serviceNeeded,
      preferredDate,
      frequency,
      region: region || "Unspecified",
      message
    }
  };
}

async function handleGardenQuote(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400"
      }
    });
  }
  if (request.method !== "POST") {
    return json({ ok: false, message: "Method not allowed." }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid request payload." }, 400);
  }

  const result = validateQuote(payload, request);
  if (result.honeypot) {
    return json({ ok: true, message: "Thanks, your quote request has been received." }, 202);
  }
  if (result.error) {
    return json({ ok: false, message: result.error }, result.status);
  }

  const webhookUrl = env.GARDEN_CLEANERS_QUOTE_WEBHOOK_URL;
  if (webhookUrl) {
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ftc-source": "garden-cleaners-subsite" },
      body: JSON.stringify({ type: "garden_cleaners_quote", lead: result.lead })
    });
    if (!webhookResponse.ok) {
      return json({ ok: false, message: "Quote intake is temporarily unavailable. Please call or email Garden Cleaners." }, 502);
    }
  } else {
    console.log("garden_cleaners_quote_received", JSON.stringify({
      receivedAt: result.lead.receivedAt,
      region: result.lead.region,
      propertyType: result.lead.propertyType,
      serviceNeeded: result.lead.serviceNeeded
    }));
  }

  return json({ ok: true, message: "Thanks. Garden Cleaners received your quote request and will follow up with the next step." });
}

function withGardenHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("x-ftc-site", "garden-cleaners");
  if ((headers.get("content-type") || "").includes("text/html")) {
    headers.set("cache-control", "private, no-store, no-cache, must-revalidate");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/garden-cleaners-quote") {
      return handleGardenQuote(request, env);
    }

    const host = hostFrom(request);
    if (!GARDEN_HOSTS.has(host)) {
      if (OG_HOSTS.has(host)) {
        const ogPath = ogAssetPath(url.pathname);
        if (ogPath) {
          const ogUrl = new URL(request.url);
          ogUrl.pathname = ogPath;
          return env.ASSETS.fetch(new Request(ogUrl.toString(), request));
        }
      }
      return env.ASSETS.fetch(request);
    }

    const normalized = normalizePath(url.pathname);
    if (ROLE_ROUTE_PATTERN.test(normalized)) {
      return new Response("Not Found", { status: 404, headers: { "cache-control": "no-store" } });
    }

    const assetPath = gardenAssetPath(normalized);
    if (!assetPath) {
      return withGardenHeaders(await env.ASSETS.fetch(request));
    }

    const assetUrl = new URL(request.url);
    assetUrl.pathname = assetPath;
    return withGardenHeaders(await env.ASSETS.fetch(new Request(assetUrl.toString(), request)));
  }
};
