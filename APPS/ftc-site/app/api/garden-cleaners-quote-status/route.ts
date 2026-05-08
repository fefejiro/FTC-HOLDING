import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";
import { getSharedAdminEmailSet, normalizeAdminEmail } from "@/lib/adminEmails";

const ALLOWED_QUOTE_STATUSES = new Set(["new", "approved", "rejected", "converted"]);

function normalizePortalEmail(value: unknown): string {
  return normalizeAdminEmail(String(value || ""));
}

function getAdminEmailSet(): Set<string> {
  return getSharedAdminEmailSet();
}

async function resolveAuthenticatedEmail(req: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerClient(req.headers);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) {
      return null;
    }
    return normalizePortalEmail(data.user.email);
  } catch {
    return null;
  }
}

async function writeAuditEvent(req: NextRequest, action: string, targetEmail?: string, details?: Record<string, unknown>) {
  try {
    const actorEmail = await resolveAuthenticatedEmail(req);
    const supabase = createServerClient(req.headers);
    await supabase.from("garden_cleaners_audit_log").insert({
      actor_email: actorEmail || "unknown",
      action,
      target_email: targetEmail || null,
      details: details || null
    });
  } catch {
    // Non-blocking audit write.
  }
}

export async function POST(req: NextRequest) {
  const callerEmail = await resolveAuthenticatedEmail(req);
  if (!callerEmail) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admins = getAdminEmailSet();
  if (!admins.has(callerEmail)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: { quote_id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const quoteId = String(body.quote_id || "").trim();
  const status = String(body.status || "").trim().toLowerCase();

  if (!quoteId) {
    return NextResponse.json({ ok: false, error: "quote_id is required" }, { status: 400 });
  }
  if (!ALLOWED_QUOTE_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid quote status" }, { status: 400 });
  }

  if (status === "converted") {
    return NextResponse.json({ ok: false, error: "Use job conversion endpoint to mark a quote converted" }, { status: 400 });
  }

  try {
    const supabase = createServerClient(req.headers);
    const { data: quote, error: quoteError } = await supabase
      .from("garden_cleaners_quotes")
      .select("id,status")
      .eq("id", quoteId)
      .maybeSingle();

    if (quoteError) {
      return NextResponse.json({ ok: false, error: quoteError.message }, { status: 500 });
    }
    if (!quote) {
      return NextResponse.json({ ok: false, error: "Quote not found" }, { status: 404 });
    }

    const currentStatus = String(quote.status || "new").toLowerCase();
    if (currentStatus === "converted") {
      return NextResponse.json({ ok: false, error: "Converted quote cannot be changed" }, { status: 409 });
    }
    if (currentStatus === status) {
      return NextResponse.json({ ok: true });
    }

    const { error: updateError } = await supabase
      .from("garden_cleaners_quotes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", quoteId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    await writeAuditEvent(req, status === "approved" ? "quote_approved" : "quote_rejected", undefined, {
      quote_id: quoteId,
      previous_status: currentStatus,
      next_status: status
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update quote status" },
      { status: 500 }
    );
  }
}
