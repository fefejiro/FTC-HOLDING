import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";
import { sendGardenPortalEmail } from "../../../lib/gardenPortalNotifications";

const VALID_JOB_STATUSES = new Set(["pending", "assigned", "in_progress", "completed", "cancelled"]);

const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(["assigned", "cancelled"]),
  assigned: new Set(["in_progress", "cancelled"]),
  in_progress: new Set(["completed", "cancelled"]),
  completed: new Set([]),
  cancelled: new Set([])
};

// Staff: Update status of assigned job
export async function POST(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { job_id, status } = await req.json();
  const jobId = String(job_id || "").trim();
  const nextStatus = String(status || "").trim().toLowerCase();

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "job_id is required" }, { status: 400 });
  }
  if (!VALID_JOB_STATUSES.has(nextStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid job status" }, { status: 400 });
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

  const currentStatus = String(job.status || "pending").toLowerCase();
  if (currentStatus === nextStatus) {
    return NextResponse.json({ ok: true });
  }

  const transitions = ALLOWED_TRANSITIONS[currentStatus] || new Set<string>();
  if (!transitions.has(nextStatus)) {
    return NextResponse.json(
      { ok: false, error: `Invalid status transition from ${currentStatus} to ${nextStatus}` },
      { status: 409 }
    );
  }

  // Only staff assigned to job can update (RLS enforced)
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("garden_cleaners_jobs")
    .update({ status: nextStatus, status_updated_at: nowIso, updated_at: nowIso })
    .eq("id", jobId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { error: assignmentError } = await supabase
    .from("garden_cleaners_job_assignments")
    .update({ status: nextStatus, status_updated_at: nowIso, updated_at: nowIso })
    .eq("job_id", jobId);

  if (assignmentError) {
    return NextResponse.json({ ok: false, error: assignmentError.message }, { status: 500 });
  }

  try {
    await sendGardenPortalEmail({
      to: String(job.customer_email || ""),
      subject: "Garden Cleaners job status update",
      text: [
        `Your Garden Cleaners job has been updated to: ${nextStatus}.`,
        "",
        `Job ID: ${jobId}`,
        `Service: ${String(job.service_type || "General cleaning")}`,
        `Location: ${String(job.address || "")}${job.city ? `, ${job.city}` : ""}`,
        "",
        "If you have any questions, reply to this email or contact our operations team."
      ].join("\n")
    });
  } catch {
    // Notification failure should not block status updates.
  }

  try {
    const { data: actorData } = await supabase.auth.getUser();
    await supabase.from("garden_cleaners_audit_log").insert({
      actor_email: String(actorData.user?.email || "unknown").toLowerCase(),
      action: "job_status_updated",
      target_email: String(job.customer_email || "").toLowerCase() || null,
      details: {
        job_id: jobId,
        previous_status: currentStatus,
        next_status: nextStatus
      }
    });
  } catch {
    // Non-blocking audit write.
  }

  return NextResponse.json({ ok: true });
}

