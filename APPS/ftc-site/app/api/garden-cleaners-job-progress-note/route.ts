import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { job_id, note } = await req.json();

  const jobId = String(job_id || "").trim();
  const progressNote = String(note || "").trim();

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "job_id is required" }, { status: 400 });
  }
  if (!progressNote) {
    return NextResponse.json({ ok: false, error: "note is required" }, { status: 400 });
  }

  const { data: actorData, error: actorError } = await (supabase.auth as any).getUser();
  if (actorError || !actorData.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: actorProfile, error: profileError } = await supabase
    .from("garden_cleaners_profiles")
    .select("id, role, is_active")
    .eq("auth_user_id", actorData.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }
  if (!actorProfile || actorProfile.role !== "staff" || actorProfile.is_active !== true) {
    return NextResponse.json({ ok: false, error: "Staff access required" }, { status: 403 });
  }

  const { data: job, error: jobError } = await supabase
    .from("garden_cleaners_jobs")
    .select("id, customer_email, staff_profile_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ ok: false, error: jobError.message }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }
  if (String(job.staff_profile_id || "") !== String(actorProfile.id || "")) {
    return NextResponse.json({ ok: false, error: "Staff can only add progress notes to assigned jobs" }, { status: 403 });
  }

  const { error: insertError } = await supabase.from("garden_cleaners_audit_log").insert({
    actor_email: String(actorData.user.email || "unknown").toLowerCase(),
    action: "job_progress_note_added",
    target_email: String(job.customer_email || "").toLowerCase() || null,
    details: {
      job_id: jobId,
      note: progressNote
    }
  });

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

