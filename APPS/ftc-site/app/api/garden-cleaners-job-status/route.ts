import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";

// Staff: Update status of assigned job
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { job_id, status } = await req.json();
  // Only staff assigned to job can update (RLS enforced)
  const { error } = await supabase.from("garden_cleaners_jobs").update({ status, status_updated_at: new Date().toISOString() }).eq("id", job_id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
