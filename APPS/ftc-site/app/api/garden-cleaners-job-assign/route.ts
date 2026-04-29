import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";

// Admin: Assign staff to job
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { job_id, staff_profile_id } = await req.json();
  // Insert assignment
  const assignment = {
    job_id,
    staff_profile_id,
    assigned_at: new Date().toISOString(),
    status: "assigned",
    status_updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("garden_cleaners_job_assignments").insert([assignment]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
