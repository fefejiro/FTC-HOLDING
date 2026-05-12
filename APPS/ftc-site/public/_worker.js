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

const ROLE_ROUTE_PATTERN = /^\/(?:garden-cleaners\/)?(?:customer|worker|cleaner|staff|admin|operator|dashboard|jobs|bookings|status|login)(?:\/|$)/;

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
  if (normalized === "/portal") {
    return "/portal";
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
  const address = normalizeText(payload.address);
  const city = normalizeText(payload.city);
  const postalCode = normalizeText(payload.postalCode);
  const propertyType = normalizeText(payload.propertyType);
  const serviceNeeded = normalizeText(payload.serviceNeeded);
  const preferredDate = normalizeText(payload.preferredDate);
  const preferredTime = normalizeText(payload.preferredTime);
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
  if (address.length < 5 || address.length > 160) return { error: "Please provide a valid service address.", status: 400 };
  if (city.length < 2 || city.length > 80) return { error: "Please provide a valid city.", status: 400 };
  if (postalCode.length > 20) return { error: "Please provide a valid postal code.", status: 400 };
  if (!PROPERTY_TYPES.has(propertyType)) return { error: "Please select a valid property type.", status: 400 };
  if (!SERVICE_OPTIONS.has(serviceNeeded)) return { error: "Please select a valid service.", status: 400 };
  if (!FREQUENCIES.has(frequency)) return { error: "Please select a valid frequency.", status: 400 };
  if (!preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) return { error: "Please select a valid preferred date.", status: 400 };
  if (preferredTime.length > 60) return { error: "Please select a valid preferred time.", status: 400 };
  if (message.length < 20 || message.length > 2000) return { error: "Please provide a concise message (20-2000 characters).", status: 400 };
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 800) return { error: "Submission flagged as automated. Please retry.", status: 422 };
  if (region && !REGIONS.has(region)) return { error: "Please select a valid service region.", status: 400 };

  const receivedAt = new Date().toISOString();
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
    status: "new",
    source: "garden_cleaners_quote_form",
    raw_payload: payload,
    created_at: receivedAt,
    updated_at: receivedAt
  };

  return {
    lead: {
      source: "garden-cleaners-subsite",
      receivedAt,
      clientKey: clientKey(request),
      fullName,
      email,
      phone,
      address,
      city,
      postalCode,
      propertyType,
      serviceNeeded,
      preferredDate,
      preferredTime,
      frequency,
      region: region || "Unspecified",
      message
    },
    quoteRecord
  };
}

function getSupabaseConfig(env) {
  const supabaseUrl = normalizeText(
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL
  ).replace(/\/+$/, "");
  const supabaseKey = normalizeText(
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY
  );

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return { supabaseUrl, supabaseKey };
}

function getSupabaseServiceConfig(env) {
  const supabaseUrl = normalizeText(
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL
  ).replace(/\/+$/, "");
  const serviceRoleKey = normalizeText(env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return { supabaseUrl, serviceRoleKey };
}

function getGardenAdminEmails(env) {
  return new Set([
    "hello@unalabs.cloud",
    "fejiro.efiuvwere@gmail.com",
    "mike.fejiro@gmail.com",
    "uby400@gmail.com",
    ...String(env.NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS || "")
      .split(",")
      .map((item) => normalizeEmail(item))
      .filter(Boolean)
  ]);
}

async function supabaseAdminRest(env, path, options = {}) {
  const config = getSupabaseServiceConfig(env);
  if (!config) {
    return json({ ok: false, error: "Supabase admin access is not configured." }, 500);
  }

  const headers = {
    "apikey": config.serviceRoleKey,
    "authorization": `Bearer ${config.serviceRoleKey}`,
    "content-type": "application/json"
  };
  if (options.prefer) {
    headers.prefer = options.prefer;
  }

  const response = await fetch(`${config.supabaseUrl}/${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    return json({ ok: false, error: typeof data === "string" ? data : data?.message || `Supabase admin request failed with status ${response.status}.` }, response.status);
  }

  return { ok: true, data };
}

async function resolveCaller(request, env) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const config = getSupabaseServiceConfig(env) || getSupabaseConfig(env);
  if (!config) {
    return null;
  }

  const apiKey = config.serviceRoleKey || config.supabaseKey;
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      "apikey": apiKey,
      "authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json().catch(() => null);
  const email = normalizeEmail(user?.email);
  const authUserId = normalizeText(user?.id);
  if (!email) {
    return null;
  }

  let profile = null;
  const profileResult = await supabaseAdminRest(
    env,
    `rest/v1/garden_cleaners_profiles?select=id,email,role,is_active,service_region,auth_user_id&or=(auth_user_id.eq.${encodeURIComponent(authUserId)},email.eq.${encodeURIComponent(email)})&limit=1`
  );
  if (!(profileResult instanceof Response)) {
    profile = Array.isArray(profileResult.data) ? profileResult.data[0] || null : null;
  }

  let role = profile?.role || null;
  if (!role) {
    role = getGardenAdminEmails(env).has(email)
      ? "admin"
      : email.endsWith("@gardencleaners.ca")
      ? "staff"
      : "client";
  }

  return {
    token,
    email,
    authUserId,
    role,
    profile,
    isAdmin: role === "admin"
  };
}

function unauthorized(message = "Unauthorized") {
  return json({ ok: false, error: message }, 401);
}

function forbidden(message = "Forbidden") {
  return json({ ok: false, error: message }, 403);
}

async function requireCaller(request, env) {
  const caller = await resolveCaller(request, env);
  return caller || unauthorized();
}

async function requireAdmin(request, env) {
  const caller = await resolveCaller(request, env);
  if (!caller) {
    return unauthorized();
  }
  if (!caller.isAdmin) {
    return forbidden();
  }
  return caller;
}

async function writeAuditLog(env, actorEmail, action, targetEmail, targetUserId, details) {
  await supabaseAdminRest(env, "rest/v1/garden_cleaners_audit_log", {
    method: "POST",
    body: [{
      actor_email: actorEmail,
      action,
      target_email: targetEmail || null,
      target_user_id: targetUserId || null,
      details: details || null
    }],
    prefer: "return=minimal"
  });
}

async function persistGardenQuote(quoteRecord, env) {
  const config = getSupabaseConfig(env);
  if (!config) {
    throw new Error("Supabase quote persistence is not configured.");
  }

  const response = await fetch(`${config.supabaseUrl}/rest/v1/garden_cleaners_quotes`, {
    method: "POST",
    headers: {
      "apikey": config.supabaseKey,
      "authorization": `Bearer ${config.supabaseKey}`,
      "content-type": "application/json",
      "prefer": "return=minimal"
    },
    body: JSON.stringify(quoteRecord)
  });

  if (!response.ok) {
    throw new Error(`Supabase quote insert failed with status ${response.status}.`);
  }
}

async function supabaseRest(request, env, table, options = {}) {
  const config = getSupabaseConfig(env);
  if (!config) {
    return json({ ok: false, error: "Supabase is not configured." }, 500);
  }

  const path = options.path || table;
  const headers = {
    "apikey": config.supabaseKey,
    "authorization": request.headers.get("authorization") || `Bearer ${config.supabaseKey}`,
    "content-type": "application/json"
  };
  if (options.prefer) {
    headers.prefer = options.prefer;
  }

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    return json({ ok: false, error: typeof data === "string" ? data : data?.message || `Supabase request failed with status ${response.status}.` }, response.status);
  }

  return { ok: true, data };
}

async function handleGardenQuotesApi(request, env) {
  if (request.method === "GET") {
    const caller = await requireAdmin(request, env);
    if (caller instanceof Response) return caller;
    const result = await supabaseAdminRest(env, "rest/v1/garden_cleaners_quotes?select=*&order=created_at.desc&limit=50");
    if (result instanceof Response) return result;
    return json({ ok: true, quotes: result.data || [] });
  }

  return handleGardenQuote(request, env);
}

async function handleGardenJobs(request, env) {
  if (request.method === "GET") {
    const caller = await requireAdmin(request, env);
    if (caller instanceof Response) return caller;
    const result = await supabaseAdminRest(env, "rest/v1/garden_cleaners_jobs?select=*&order=created_at.desc");
    if (result instanceof Response) return result;
    return json({ ok: true, jobs: result.data || [] });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const caller = await requireAdmin(request, env);
  if (caller instanceof Response) return caller;

  const payload = await request.json().catch(() => null);
  const quoteId = normalizeText(payload?.quote_id);
  if (!quoteId) {
    return json({ ok: false, error: "quote_id is required." }, 400);
  }

  const quoteResult = await supabaseAdminRest(env, `rest/v1/garden_cleaners_quotes?select=*&id=eq.${encodeURIComponent(quoteId)}&limit=1`);
  if (quoteResult instanceof Response) return quoteResult;
  const quote = Array.isArray(quoteResult.data) ? quoteResult.data[0] : null;
  if (!quote) {
    return json({ ok: false, error: "Quote not found." }, 404);
  }

  const now = new Date().toISOString();
  const jobRecord = {
    quote_id: quote.id,
    customer_email: quote.email,
    address: quote.address,
    city: quote.city,
    region: quote.region,
    service_type: quote.service_type,
    service_frequency: quote.service_frequency,
    property_type: quote.property_type,
    status: "pending",
    status_updated_at: now,
    created_at: now,
    updated_at: now
  };
  const insertResult = await supabaseAdminRest(env, "rest/v1/garden_cleaners_jobs", {
    method: "POST",
    body: [jobRecord],
    prefer: "return=representation"
  });
  if (insertResult instanceof Response) return insertResult;
  return json({ ok: true, job: Array.isArray(insertResult.data) ? insertResult.data[0] : null });
}

async function handleGardenMyJobs(request, env) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  const caller = await requireCaller(request, env);
  if (caller instanceof Response) return caller;

  if (caller.role === "admin") {
    const result = await supabaseAdminRest(env, "rest/v1/garden_cleaners_jobs?select=*&order=created_at.desc");
    if (result instanceof Response) return result;
    return json({ ok: true, jobs: result.data || [] });
  }

  if (caller.role === "staff") {
    const staffProfileId = normalizeText(caller.profile?.id || "");
    if (!staffProfileId) {
      return json({ ok: true, jobs: [] });
    }
    const result = await supabaseAdminRest(env, `rest/v1/garden_cleaners_jobs?select=*&staff_profile_id=eq.${encodeURIComponent(staffProfileId)}&order=created_at.desc`);
    if (result instanceof Response) return result;
    return json({ ok: true, jobs: result.data || [] });
  }

  const result = await supabaseAdminRest(env, `rest/v1/garden_cleaners_jobs?select=*&customer_email=eq.${encodeURIComponent(caller.email)}&order=created_at.desc`);
  if (result instanceof Response) return result;
  return json({ ok: true, jobs: result.data || [] });
}

async function handleGardenJobAssign(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  const caller = await requireAdmin(request, env);
  if (caller instanceof Response) return caller;
  const payload = await request.json().catch(() => null);
  const jobId = normalizeText(payload?.job_id);
  const staffProfileId = normalizeText(payload?.staff_profile_id);
  if (!jobId || !staffProfileId) {
    return json({ ok: false, error: "job_id and staff_profile_id are required." }, 400);
  }
  const now = new Date().toISOString();
  const result = await supabaseAdminRest(env, "rest/v1/garden_cleaners_job_assignments", {
    method: "POST",
    body: [{ job_id: jobId, staff_profile_id: staffProfileId, assigned_at: now, status: "assigned", status_updated_at: now }],
    prefer: "return=minimal"
  });
  if (result instanceof Response) return result;
  return json({ ok: true });
}

async function handleGardenJobStatus(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  const caller = await requireCaller(request, env);
  if (caller instanceof Response) return caller;
  const payload = await request.json().catch(() => null);
  const jobId = normalizeText(payload?.job_id);
  const status = normalizeText(payload?.status);
  if (!jobId || !status) {
    return json({ ok: false, error: "job_id and status are required." }, 400);
  }

  if (caller.role === "staff") {
    const staffProfileId = normalizeText(caller.profile?.id || "");
    if (!staffProfileId) {
      return forbidden();
    }
    const ownedJobResult = await supabaseAdminRest(env, `rest/v1/garden_cleaners_jobs?select=id&staff_profile_id=eq.${encodeURIComponent(staffProfileId)}&id=eq.${encodeURIComponent(jobId)}&limit=1`);
    if (ownedJobResult instanceof Response) return ownedJobResult;
    const ownedJob = Array.isArray(ownedJobResult.data) ? ownedJobResult.data[0] : null;
    if (!ownedJob) {
      return forbidden();
    }
  } else if (caller.role !== "admin") {
    return forbidden();
  }

  const result = await supabaseAdminRest(env, `rest/v1/garden_cleaners_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    body: { status, status_updated_at: new Date().toISOString() },
    prefer: "return=minimal"
  });
  if (result instanceof Response) return result;
  return json({ ok: true });
}

async function handleGardenQuoteStatus(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  const caller = await requireAdmin(request, env);
  if (caller instanceof Response) return caller;
  const payload = await request.json().catch(() => null);
  const quoteId = normalizeText(payload?.quote_id);
  const status = normalizeText(payload?.status);
  if (!quoteId || !["approved", "rejected"].includes(status)) {
    return json({ ok: false, error: "quote_id and valid status are required." }, 400);
  }
  const result = await supabaseAdminRest(env, `rest/v1/garden_cleaners_quotes?id=eq.${encodeURIComponent(quoteId)}`, {
    method: "PATCH",
    body: { status, updated_at: new Date().toISOString() },
    prefer: "return=minimal"
  });
  if (result instanceof Response) return result;
  return json({ ok: true });
}

async function handleGardenAdminUsers(request, env) {
  const caller = await requireAdmin(request, env);
  if (caller instanceof Response) return caller;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") || 25)));
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  if (request.method === "GET") {
    const view = normalizeText(url.searchParams.get("view") || "").toLowerCase();
    if (view === "audit") {
      const result = await supabaseAdminRest(env, `rest/v1/garden_cleaners_audit_log?select=id,actor_email,action,target_email,target_user_id,details,created_at&order=created_at.desc&offset=${start}&limit=${perPage}`);
      if (result instanceof Response) return result;
      return json({ ok: true, entries: result.data || [] });
    }

    const search = normalizeText(url.searchParams.get("search") || "").toLowerCase();
    const role = normalizeText(url.searchParams.get("role") || "all");
    const status = normalizeText(url.searchParams.get("status") || "all");
    const filters = [
      "select=id,auth_user_id,email,display_name,role,is_active,service_region,created_at,updated_at",
      "order=created_at.desc",
      `offset=${start}`,
      `limit=${perPage}`
    ];
    if (search) {
      filters.push(`or=(email.ilike.*${encodeURIComponent(search)}*,display_name.ilike.*${encodeURIComponent(search)}*)`);
    }
    if (role !== "all") {
      filters.push(`role=eq.${encodeURIComponent(role)}`);
    }
    if (status === "active") {
      filters.push("is_active=eq.true");
    } else if (status === "disabled") {
      filters.push("is_active=eq.false");
    }
    const result = await supabaseAdminRest(env, `rest/v1/garden_cleaners_profiles?${filters.join("&")}`);
    if (result instanceof Response) return result;
    return json({ ok: true, users: result.data || [], total: Array.isArray(result.data) ? result.data.length : 0, page, perPage });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return json({ ok: false, error: "Invalid request body" }, 400);
  }

  if (request.method === "POST") {
    const email = normalizeEmail(body.email);
    const role = normalizeText(body.role || "client");
    if (!email || !["admin", "staff", "client"].includes(role)) {
      return json({ ok: false, error: "Valid email and role are required." }, 400);
    }
    const profile = {
      email,
      display_name: normalizeText(body.display_name) || null,
      role,
      is_active: true,
      service_region: normalizeText(body.service_region) || null,
      created_by: caller.email,
      updated_by: caller.email
    };
    const result = await supabaseAdminRest(env, "rest/v1/garden_cleaners_profiles?on_conflict=email", {
      method: "POST",
      body: [profile],
      prefer: "resolution=merge-duplicates,return=representation"
    });
    if (result instanceof Response) return result;
    await writeAuditLog(env, caller.email, "invite_user", email, null, { role });
    return json({ ok: true, email, role });
  }

  if (request.method === "PATCH") {
    const profileId = normalizeText(body.profile_id);
    if (!profileId) {
      return json({ ok: false, error: "profile_id is required." }, 400);
    }
    const updates = { updated_by: caller.email };
    if (body.role !== undefined) updates.role = normalizeText(body.role) || null;
    if (body.is_active !== undefined) updates.is_active = !!body.is_active;
    if (body.display_name !== undefined) updates.display_name = normalizeText(body.display_name) || null;
    if (body.service_region !== undefined) updates.service_region = normalizeText(body.service_region) || null;
    const result = await supabaseAdminRest(env, `rest/v1/garden_cleaners_profiles?id=eq.${encodeURIComponent(profileId)}`, {
      method: "PATCH",
      body: updates,
      prefer: "return=minimal"
    });
    if (result instanceof Response) return result;
    await writeAuditLog(env, caller.email, body.role ? "change_role" : "update_user", null, profileId, updates);
    return json({ ok: true });
  }

  if (request.method === "PUT") {
    const email = normalizeEmail(body.email);
    if (!email) {
      return json({ ok: false, error: "Email is required." }, 400);
    }
    await writeAuditLog(env, caller.email, "resend_invite", email, null, { mode: "google_sign_in" });
    return json({ ok: true, message: "User can sign in with Google using this email address." });
  }

  return json({ ok: false, error: "Method not allowed." }, 405);
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

  try {
    await persistGardenQuote(result.quoteRecord, env);
  } catch (error) {
    console.error("garden_cleaners_quote_supabase_error", JSON.stringify({
      message: error instanceof Error ? error.message : "unknown"
    }));
    return json({ ok: false, message: "Quote intake is temporarily unavailable. Please call or email Garden Cleaners." }, 500);
  }

  const webhookUrl = env.GARDEN_CLEANERS_QUOTE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ftc-source": "garden-cleaners-subsite" },
        body: JSON.stringify({ type: "garden_cleaners_quote", quote: result.quoteRecord })
      });
      if (!webhookResponse.ok) {
        console.warn("garden_cleaners_quote_webhook_failed", JSON.stringify({ status: webhookResponse.status }));
      }
    } catch (error) {
      console.warn("garden_cleaners_quote_webhook_error", JSON.stringify({
        message: error instanceof Error ? error.message : "unknown"
      }));
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
      return handleGardenQuotesApi(request, env);
    }
    if (url.pathname === "/api/garden-cleaners-quote-status") {
      return handleGardenQuoteStatus(request, env);
    }
    if (url.pathname === "/api/garden-cleaners-job") {
      return handleGardenJobs(request, env);
    }
    if (url.pathname === "/api/garden-cleaners-my-jobs") {
      return handleGardenMyJobs(request, env);
    }
    if (url.pathname === "/api/garden-cleaners-job-assign") {
      return handleGardenJobAssign(request, env);
    }
    if (url.pathname === "/api/garden-cleaners-job-status") {
      return handleGardenJobStatus(request, env);
    }
    if (url.pathname === "/api/garden-cleaners-admin-users") {
      return handleGardenAdminUsers(request, env);
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
