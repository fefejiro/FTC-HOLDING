import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type SupabaseClient } from "@ftc/supabase";

type Role = "admin" | "staff" | "client";

type LocationInput = {
  id?: string;
  customer_email?: string;
  location_name?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  access_notes?: string;
  service_notes?: string;
  is_default?: boolean;
  is_active?: boolean;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toEmail(value: unknown): string {
  return toText(value).toLowerCase();
}

function toNumberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function resolveRoleAndUser(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.id) {
    return { supabase, error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const userEmail = toEmail(authData.user.email);
  const { data: profile, error: profileError } = await supabase
    .from("garden_cleaners_profiles")
    .select("id,role,is_active")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    return { supabase, error: NextResponse.json({ ok: false, error: profileError.message }, { status: 500 }) };
  }

  if (!profile || profile.is_active !== true) {
    return { supabase, error: NextResponse.json({ ok: false, error: "Profile is missing or inactive" }, { status: 403 }) };
  }

  return {
    supabase,
    role: String(profile.role) as Role,
    authUserId: authData.user.id,
    userEmail,
    error: null as NextResponse | null
  };
}

async function clearDefaultForCustomer(supabase: SupabaseClient, customerEmail: string, excludeId?: string) {
  let query = supabase
    .from("garden_cleaners_service_locations")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("customer_email", customerEmail);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  await query;
}

export async function GET(req: NextRequest) {
  const resolved = await resolveRoleAndUser(req);
  if (resolved.error) {
    return resolved.error;
  }

  const { supabase, role, userEmail } = resolved;
  const { searchParams } = new URL(req.url);
  const requestedCustomerEmail = toEmail(searchParams.get("customer_email"));

  let query = supabase
    .from("garden_cleaners_service_locations")
    .select("id,customer_email,location_name,address,city,region,postal_code,country,latitude,longitude,access_notes,service_notes,is_default,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (role === "admin") {
    if (requestedCustomerEmail) {
      query = query.eq("customer_email", requestedCustomerEmail);
    }
  } else {
    query = query.eq("customer_email", userEmail);
  }

  const { data, error } = await query;

  if (error) {
    const message = String(error.message || "");
    if (/relation|table/i.test(message)) {
      return NextResponse.json({
        ok: true,
        locations: [],
        warning: "Service location table is missing. Create garden_cleaners_service_locations to enable this feature."
      });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, locations: data || [] });
}

export async function POST(req: NextRequest) {
  const resolved = await resolveRoleAndUser(req);
  if (resolved.error) {
    return resolved.error;
  }

  const { supabase, role, userEmail } = resolved;
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const payload = (await req.json().catch(() => null)) as LocationInput | null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const customerEmail = toEmail(payload.customer_email);
  const address = toText(payload.address);
  if (!customerEmail) {
    return NextResponse.json({ ok: false, error: "customer_email is required" }, { status: 400 });
  }
  if (address.length < 5) {
    return NextResponse.json({ ok: false, error: "address is required" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const isDefault = payload.is_default === true;

  const record = {
    customer_email: customerEmail,
    location_name: toText(payload.location_name) || null,
    address,
    city: toText(payload.city) || null,
    region: toText(payload.region) || "Unspecified",
    postal_code: toText(payload.postal_code) || null,
    country: toText(payload.country) || "Canada",
    latitude: toNumberOrNull(payload.latitude),
    longitude: toNumberOrNull(payload.longitude),
    access_notes: toText(payload.access_notes) || null,
    service_notes: toText(payload.service_notes) || null,
    is_default: isDefault,
    is_active: payload.is_active !== false,
    created_by: userEmail,
    created_at: nowIso,
    updated_at: nowIso
  };

  const { data, error } = await supabase.from("garden_cleaners_service_locations").insert([record]).select("*").single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (isDefault && data?.id) {
    await clearDefaultForCustomer(supabase, customerEmail, String(data.id));
  }

  return NextResponse.json({ ok: true, location: data });
}

export async function PATCH(req: NextRequest) {
  const resolved = await resolveRoleAndUser(req);
  if (resolved.error) {
    return resolved.error;
  }

  const { supabase, role, userEmail } = resolved;
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const payload = (await req.json().catch(() => null)) as LocationInput | null;
  const id = toText(payload?.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("garden_cleaners_service_locations")
    .select("id,customer_email")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Location not found" }, { status: 404 });
  }

  const customerEmail = toEmail(payload?.customer_email) || toEmail(existing.customer_email);
  const isDefault = payload?.is_default === true;

  const updatePayload: Record<string, unknown> = {
    location_name: toText(payload?.location_name) || null,
    address: toText(payload?.address) || null,
    city: toText(payload?.city) || null,
    region: toText(payload?.region) || null,
    postal_code: toText(payload?.postal_code) || null,
    country: toText(payload?.country) || null,
    latitude: toNumberOrNull(payload?.latitude),
    longitude: toNumberOrNull(payload?.longitude),
    access_notes: toText(payload?.access_notes) || null,
    service_notes: toText(payload?.service_notes) || null,
    is_default: isDefault,
    is_active: payload?.is_active !== false,
    updated_by: userEmail,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("garden_cleaners_service_locations")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (isDefault) {
    await clearDefaultForCustomer(supabase, customerEmail, id);
  }

  return NextResponse.json({ ok: true, location: data });
}
