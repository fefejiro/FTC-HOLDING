import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";

// Staff: List assigned jobs; Customer: List own jobs
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  // RLS enforces that staff only see assigned jobs, customers only see their own
  const { data, error } = await supabase.from("garden_cleaners_jobs").select("*");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, jobs: data });
}
