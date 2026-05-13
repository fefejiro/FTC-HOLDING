import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";

const VALID_VISIBILITY = new Set(["internal", "customer_visible"]);

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { job_id, body, visibility } = await req.json();

  const jobId = String(job_id || "").trim();
  const noteBody = String(body || "").trim();
  const noteVisibility = String(visibility || "internal").trim().toLowerCase();

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "job_id is required" }, { status: 400 });
  }
  if (!noteBody) {
    return NextResponse.json({ ok: false, error: "Note body is required" }, { status: 400 });
  }
  if (!VALID_VISIBILITY.has(noteVisibility)) {
    return NextResponse.json({ ok: false, error: "Invalid visibility" }, { status: 400 });
  }

  const { data: actorData, error: actorError } = await supabase.auth.getUser();
  if (actorError || !actorData.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: actorProfile, error: profileError } = await supabase
    .from("garden_cleaners_profiles")
    .select("role")
    .eq("id", actorData.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }
  if (!actorProfile || actorProfile.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 });
  }

  const { data: job, error: jobError } = await supabase
    .from("garden_cleaners_jobs")
    .select("id, customer_email")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ ok: false, error: jobError.message }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  const action = noteVisibility === "customer_visible" ? "job_customer_comment_added" : "job_internal_note_added";
  const { error: auditError } = await supabase.from("garden_cleaners_audit_log").insert({
    actor_email: String(actorData.user.email || "unknown").toLowerCase(),
    action,
    target_email: String(job.customer_email || "").toLowerCase() || null,
    details: {
      job_id: jobId,
      body: noteBody,
      visibility: noteVisibility
    }
  });

  if (auditError) {
    return NextResponse.json({ ok: false, error: auditError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
