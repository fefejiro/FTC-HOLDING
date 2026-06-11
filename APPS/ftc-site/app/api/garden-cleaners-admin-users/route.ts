import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin-only user management API for Garden Cleaners portal.
// All privileged operations use the Supabase service-role key server-side.
// The service-role key is NEVER sent to the browser.

const ADMIN_EMAILS = new Set([
  "hello@unalabs.cloud",
  "fejiro.efiuvwere@gmail.com",
  "mike.fejiro@gmail.com",
  "uby400@gmail.com",
  ...(process.env.NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
]);

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin credentials are not configured.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAdminAuth(admin: ReturnType<typeof createAdminClient>) {
  return admin.auth as any;
}

async function resolveCallerEmail(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const admin = createAdminClient();
  const { data, error } = await getAdminAuth(admin).getUser(token);
  if (error || !data.user) return null;
  return (data.user.email || "").trim().toLowerCase();
}

async function assertAdmin(req: NextRequest): Promise<{ email: string } | NextResponse> {
  const email = await resolveCallerEmail(req);
  if (!email || !ADMIN_EMAILS.has(email)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }
  return { email };
}

async function writeAuditLog(
  admin: ReturnType<typeof createAdminClient>,
  actorEmail: string,
  action: string,
  targetEmail?: string,
  targetUserId?: string,
  details?: Record<string, unknown>
) {
  await admin.from("garden_cleaners_audit_log").insert({
    actor_email: actorEmail,
    action,
    target_email: targetEmail ?? null,
    target_user_id: targetUserId ?? null,
    details: details ?? null,
  });
}

// GET /api/garden-cleaners-admin-users
// List all profiles (admin only). Paginated via ?page=1&per_page=50
export async function GET(req: NextRequest) {
  const caller = await assertAdmin(req);
  if (caller instanceof NextResponse) return caller;

  const { searchParams } = new URL(req.url);
  const view = (searchParams.get("view") || "").trim().toLowerCase();

  if (view === "audit") {
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "25", 10)));
    const action = (searchParams.get("action") || "").trim().toLowerCase();

    try {
      const admin = createAdminClient();
      let query = admin
        .from("garden_cleaners_audit_log")
        .select("id, actor_email, action, target_email, target_user_id, details, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (action) {
        query = query.eq("action", action);
      }

      const { data, error, count } = await query;
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, entries: data || [], total: count ?? 0, page, perPage });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Internal error";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "50", 10)));
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const roleFilter = (searchParams.get("role") || "all").trim();
  const statusFilter = (searchParams.get("status") || "all").trim();

  try {
    const admin = createAdminClient();
    let query = admin
      .from("garden_cleaners_profiles")
      .select("id, auth_user_id, email, display_name, role, is_active, service_region, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
    }
    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter);
    }
    if (statusFilter === "active") {
      query = query.eq("is_active", true);
    } else if (statusFilter === "disabled") {
      query = query.eq("is_active", false);
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, users: data, total: count ?? 0, page, perPage });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/garden-cleaners-admin-users
// Create/invite a new user
export async function POST(req: NextRequest) {
  const caller = await assertAdmin(req);
  if (caller instanceof NextResponse) return caller;

  let body: { email?: string; display_name?: string; role?: string; service_region?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const displayName = (body.display_name || "").trim();
  const role = (body.role || "client").trim();
  const serviceRegion = (body.service_region || "").trim() || null;

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
  }
  if (!["admin", "staff", "client"].includes(role)) {
    return NextResponse.json({ ok: false, error: "Invalid role. Must be admin, staff, or client" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Invite the user via Supabase Auth
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "https://gardencleaners.ca"}/garden-cleaners/portal#portal-access`;
    const { data: inviteData, error: inviteError } = await getAdminAuth(admin).admin.inviteUserByEmail(email, {
      redirectTo,
      data: { display_name: displayName, garden_role: role },
    });
    if (inviteError) {
      return NextResponse.json({ ok: false, error: inviteError.message }, { status: 400 });
    }

    const authUserId = inviteData.user?.id ?? null;

    // Upsert profile row
    const { error: profileError } = await admin.from("garden_cleaners_profiles").upsert(
      {
        auth_user_id: authUserId,
        email,
        display_name: displayName || null,
        role,
        is_active: true,
        service_region: serviceRegion,
        created_by: caller.email,
        updated_by: caller.email,
      },
      { onConflict: "email" }
    );
    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
    }

    await writeAuditLog(admin, caller.email, "invite_user", email, authUserId ?? undefined, { role });

    return NextResponse.json({ ok: true, email, role });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PATCH /api/garden-cleaners-admin-users
// Update role, is_active, display_name, or service_region for an existing user
export async function PATCH(req: NextRequest) {
  const caller = await assertAdmin(req);
  if (caller instanceof NextResponse) return caller;

  let body: {
    profile_id?: string;
    role?: string;
    is_active?: boolean;
    display_name?: string;
    service_region?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const profileId = (body.profile_id || "").trim();
  if (!profileId) {
    return NextResponse.json({ ok: false, error: "profile_id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_by: caller.email };

  if (body.role !== undefined) {
    if (!["admin", "staff", "client"].includes(body.role)) {
      return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
    }
    updates.role = body.role;
  }
  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }
  if (body.display_name !== undefined) {
    updates.display_name = (body.display_name || "").trim() || null;
  }
  if (body.service_region !== undefined) {
    updates.service_region = (body.service_region || "").trim() || null;
  }

  try {
    const admin = createAdminClient();

    // Fetch target profile to resolve email for audit log
    const { data: profile, error: fetchError } = await admin
      .from("garden_cleaners_profiles")
      .select("email, auth_user_id")
      .eq("id", profileId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const { error: updateError } = await admin
      .from("garden_cleaners_profiles")
      .update(updates)
      .eq("id", profileId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    const action =
      body.is_active === false
        ? "disable_user"
        : body.is_active === true
        ? "reactivate_user"
        : body.role
        ? "change_role"
        : "update_user";

    await writeAuditLog(admin, caller.email, action, profile.email, profile.auth_user_id ?? undefined, updates);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PUT /api/garden-cleaners-admin-users
// Resend invite or password reset email
export async function PUT(req: NextRequest) {
  const caller = await assertAdmin(req);
  if (caller instanceof NextResponse) return caller;

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "https://gardencleaners.ca"}/garden-cleaners/portal#portal-access`;

    // Find existing auth user by email
    const { data: listData, error: listError } = await getAdminAuth(admin).admin.listUsers();
    if (listError) {
      return NextResponse.json({ ok: false, error: listError.message }, { status: 500 });
    }
    const existingUser = listData.users.find((u: { email?: string | null }) => (u.email || "").toLowerCase() === email);

    if (existingUser) {
      // Send password reset
      const { error: resetError } = await getAdminAuth(admin).admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      if (resetError) {
        return NextResponse.json({ ok: false, error: resetError.message }, { status: 400 });
      }
      await writeAuditLog(admin, caller.email, "reset_password", email, existingUser.id);
    } else {
      // Send fresh invite
      const { data: inviteData, error: inviteError } = await getAdminAuth(admin).admin.inviteUserByEmail(email, { redirectTo });
      if (inviteError) {
        return NextResponse.json({ ok: false, error: inviteError.message }, { status: 400 });
      }
      await writeAuditLog(admin, caller.email, "resend_invite", email, inviteData.user?.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
