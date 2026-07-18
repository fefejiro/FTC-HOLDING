import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";

// Admin: List all jobs
export async function GET(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  // Only admin can see all jobs (RLS enforced)
  const { data, error } = await supabase.from("garden_cleaners_jobs").select("*");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, jobs: data });
}

// Admin: Convert quote to job
export async function POST(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { quote_id } = await req.json();
  if (!quote_id) {
    return NextResponse.json({ ok: false, error: "quote_id is required" }, { status: 400 });
  }

  // Fetch quote
  const { data: quote, error: quoteError } = await supabase.from("garden_cleaners_quotes").select("*").eq("id", quote_id).single();
  if (quoteError || !quote) return NextResponse.json({ ok: false, error: "Quote not found" }, { status: 404 });

  const currentQuoteStatus = String(quote.status || "new").toLowerCase();
  if (currentQuoteStatus !== "approved") {
    return NextResponse.json({ ok: false, error: "Quote must be approved before conversion" }, { status: 409 });
  }

  const { data: existingJob } = await supabase
    .from("garden_cleaners_jobs")
    .select("id")
    .eq("quote_id", quote_id)
    .maybeSingle();

  if (existingJob?.id) {
    return NextResponse.json({ ok: false, error: "Quote already converted to a job" }, { status: 409 });
  }

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
  const { data: insertedJob, error: jobError } = await supabase
    .from("garden_cleaners_jobs")
    .insert([jobRecord])
    .select("id")
    .single();
  if (jobError) return NextResponse.json({ ok: false, error: jobError.message }, { status: 500 });

  const { error: quoteUpdateError } = await supabase
    .from("garden_cleaners_quotes")
    .update({ status: "converted", updated_at: new Date().toISOString() })
    .eq("id", quote_id);

  if (quoteUpdateError) {
    return NextResponse.json(
      {
        ok: false,
        error: `Job created but quote status update failed: ${quoteUpdateError.message}`,
        job_id: insertedJob?.id || null
      },
      { status: 500 }
    );
  }

  try {
    const { data: actorData } = await supabase.auth.getUser();
    await supabase.from("garden_cleaners_audit_log").insert({
      actor_email: String(actorData.user?.email || "unknown").toLowerCase(),
      action: "quote_converted_to_job",
      target_email: String(quote.email || "").toLowerCase() || null,
      details: {
        quote_id,
        job_id: insertedJob?.id || null
      }
    });
  } catch {
    // Non-blocking audit write.
  }

  return NextResponse.json({ ok: true, job_id: insertedJob?.id || null });
}

