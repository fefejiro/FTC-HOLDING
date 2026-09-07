import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";

function environment(): Env {
  return {
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    STRIPE_PRICE_STARTER_MONTHLY: "price_starter_monthly",
    STRIPE_PRICE_STARTER_ANNUAL: "price_starter_annual",
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: "price_professional_monthly",
    STRIPE_PRICE_PROFESSIONAL_ANNUAL: "price_professional_annual",
    STRIPE_PRICE_AGENCY_MONTHLY: "price_agency_monthly",
    STRIPE_PRICE_AGENCY_ANNUAL: "price_agency_annual",
    STRIPE_PRICE_ENTERPRISE_MONTHLY: "price_enterprise_monthly",
    STRIPE_PRICE_ENTERPRISE_ANNUAL: "price_enterprise_annual",
    UNALABS_SITE_URL: "https://unalabs.cloud",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key"
  };
}

afterEach(() => vi.restoreAllMocks());

describe("public status", () => {
  it("keeps the operations status endpoint publicly available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));

    const response = await worker.fetch(
      new Request("https://una-stripe-api.example/api/status"),
      environment()
    );
    const payload = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.report_url).toBe("https://unalabs.cloud/status/");
    expect(payload.score).toEqual({ done: 12, in_progress: 1, not_started: 0, total: 13 });
    expect(payload.autocollect).toBeNull();
  });
});
