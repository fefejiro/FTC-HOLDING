import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";

// Admin: List all jobs
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  // Only admin can see all jobs (RLS enforced)
  const { data, error } = await supabase.from("garden_cleaners_jobs").select("*");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, jobs: data });
}

// Admin: Convert quote to job
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { quote_id } = await req.json();
  // Fetch quote
  const { data: quote, error: quoteError } = await supabase.from("garden_cleaners_quotes").select("*").eq("id", quote_id).single();
  if (quoteError || !quote) return NextResponse.json({ ok: false, error: "Quote not found" }, { status: 404 });
  // Create job
  const jobRecord = {
    quote_id: quote.id,
    customer_email: quote.email,
    address: quote.address,
    city: quote.city,
    region: quote.region,
    service_type: quote.service_type,
    service_frequency: quote.service_frequency,
    property_type: quote.property_type,
    status: "pending",
    status_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error: jobError } = await supabase.from("garden_cleaners_jobs").insert([jobRecord]);
  if (jobError) return NextResponse.json({ ok: false, error: jobError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
