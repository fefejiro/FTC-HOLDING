import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";
import { sendGardenPortalEmail } from "../../../lib/gardenPortalNotifications";

// Admin: Assign staff to job
export async function POST(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { job_id, staff_profile_id } = await req.json();
  const jobId = String(job_id || "").trim();
  const staffProfileId = String(staff_profile_id || "").trim();

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "job_id is required" }, { status: 400 });
  }
  if (!staffProfileId) {
    return NextResponse.json({ ok: false, error: "staff_profile_id is required" }, { status: 400 });
  }

  const { data: job, error: jobError } = await supabase
    .from("garden_cleaners_jobs")
    .select("id,status,customer_email,address,city,service_type")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ ok: false, error: jobError.message }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("garden_cleaners_profiles")
    .select("id, role, is_active")
    .eq("id", staffProfileId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }
  if (!profile || profile.role !== "staff" || profile.is_active !== true) {
    return NextResponse.json({ ok: false, error: "Staff profile is invalid or inactive" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  // Insert assignment
  const assignment = {
    job_id: jobId,
    staff_profile_id: staffProfileId,
    assigned_at: nowIso,
    status: "assigned",
    status_updated_at: nowIso,
    updated_at: nowIso,
  };

  const { error } = await supabase.from("garden_cleaners_job_assignments").insert([assignment]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { error: updateJobError } = await supabase
    .from("garden_cleaners_jobs")
    .update({ staff_profile_id: staffProfileId, status: "assigned", status_updated_at: nowIso, updated_at: nowIso })
    .eq("id", jobId);

  if (updateJobError) {
    return NextResponse.json({ ok: false, error: updateJobError.message }, { status: 500 });
  }

  try {
    await sendGardenPortalEmail({
      to: String(job.customer_email || ""),
      subject: "Garden Cleaners job assignment update",
      text: [
        "Your service request has been assigned and is moving into execution.",
        "",
        `Job ID: ${jobId}`,
        `Service: ${String(job.service_type || "General cleaning")}`,
        `Location: ${String(job.address || "")}${job.city ? `, ${job.city}` : ""}`,
        "",
        "You will receive another update when service starts."
      ].join("\n")
    });
  } catch {
    // Notification failure should not block assignment updates.
  }

  try {
    const { data: actorData } = await supabase.auth.getUser();
    await supabase.from("garden_cleaners_audit_log").insert({
      actor_email: String(actorData.user?.email || "unknown").toLowerCase(),
      action: "job_assigned",
      target_email: String(job.customer_email || "").toLowerCase() || null,
      details: { job_id: jobId, staff_profile_id: staffProfileId }
    });
  } catch {
    // Non-blocking audit write.
  }

  return NextResponse.json({ ok: true });
}
