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

describe("coaching public endpoints", () => {
  it("serves the configured coaching price", async () => {
    const response = await worker.fetch(
      new Request("https://una-stripe-api.example/api/coaching/config"),
      { ...environment(), COACHING_SESSION_PRICE_CAD: "175" }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ price_cad: 175 });
  });

  it("rate limits coaching checkout requests before parsing the body", async () => {
    const env = { ...environment(), COACHING_RATE_LIMIT_MAX: "1" };
    const request = () => new Request("https://una-stripe-api.example/api/coaching/create-session", {
      method: "POST",
      headers: { "cf-connecting-ip": "coaching-test-ip" },
      body: "{",
    });

    const first = await worker.fetch(request(), env);
    const second = await worker.fetch(request(), env);

    expect(first.status).toBe(400);
    expect(second.status).toBe(429);
  });
});
