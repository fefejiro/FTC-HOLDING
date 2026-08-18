import type Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./index";
import {
  forwardJobAgentStripeEvent,
  handleJobAgentRoute,
  normalizeJobAgentStripeEvent,
  type JobAgentBillingEvent
} from "./jobagent";

const userId = "5a79c30a-f59a-4f5a-a625-d3d6bffba002";

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
    JOBAGENT_APP_ORIGIN: "https://jobagent.unalabs.cloud",
    JOBAGENT_API_ORIGIN: "https://jobagent.unalabs.cloud",
    JOBAGENT_BILLING_SHARED_SECRET: "shared-secret"
  };
}

function stripeDouble() {
  return {
    prices: {
      list: vi.fn().mockResolvedValue({
        data: [{ id: "price_monthly", currency: "cad", unit_amount: 2999, recurring: { interval: "month" } }]
      }),
      create: vi.fn()
    },
    customers: {
      retrieve: vi.fn().mockResolvedValue({
        id: "cus_existing",
        metadata: { jobagent_user_id: userId }
      }),
      create: vi.fn().mockResolvedValue({
        id: "cus_new",
        metadata: { jobagent_user_id: userId }
      })
    },
    promotionCodes: {
      list: vi.fn().mockResolvedValue({ data: [{
        id: "promo_founding",
        max_redemptions: 100,
        promotion: { type: "coupon", coupon: { max_redemptions: 100, percent_off: 25, duration: "repeating", duration_in_months: 3 } }
      }] }),
      create: vi.fn()
    },
    coupons: { retrieve: vi.fn(), create: vi.fn() },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/pay/cs_test_123",
          livemode: false
        })
      }
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/p/session/test" })
      }
    },
    subscriptions: { retrieve: vi.fn() },
    paymentIntents: { retrieve: vi.fn() }
  };
}

function checkoutRequest(body: Record<string, unknown>) {
  return new Request("https://una-stripe-api.example/api/jobagent/checkout", {
    method: "POST",
    headers: {
      authorization: "Bearer shared-secret",
      "content-type": "application/json",
      origin: "https://jobagent.unalabs.cloud"
    },
    body: JSON.stringify(body)
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("JobAgent billing gateway", () => {
  it("creates a subscription checkout bound to the exact JobAgent user", async () => {
    const stripe = stripeDouble();
    const response = await handleJobAgentRoute(checkoutRequest({
      userId,
      email: "candidate@example.com",
      customerId: null,
      planCode: "jobagent_monthly",
      idempotencyKey: "request-key-123",
      successUrl: "https://jobagent.unalabs.cloud/app?billing=success",
      cancelUrl: "https://jobagent.unalabs.cloud/app?billing=cancelled"
    }), environment(), stripe as unknown as Stripe, "https://jobagent.unalabs.cloud");

    expect(response?.status).toBe(201);
    await expect(response?.json()).resolves.toMatchObject({
      sessionId: "cs_test_123",
      customerId: "cus_new",
      livemode: false
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        client_reference_id: userId,
        metadata: expect.objectContaining({
          service_type: "jobagent_subscription",
          jobagent_user_id: userId,
          plan_code: "jobagent_monthly"
        }),
        discounts: [{ promotion_code: "promo_founding" }]
      }),
      { idempotencyKey: `jobagent:checkout:${userId}:request-key-123` }
    );
  });

  it("rejects return URLs outside the configured JobAgent origin", async () => {
    const stripe = stripeDouble();
    const response = await handleJobAgentRoute(checkoutRequest({
      userId,
      email: "candidate@example.com",
      customerId: null,
      planCode: "jobagent_monthly",
      idempotencyKey: "request-key-123",
      successUrl: "https://attacker.example/paid",
      cancelUrl: "https://jobagent.unalabs.cloud/app"
    }), environment(), stripe as unknown as Stripe, "https://jobagent.unalabs.cloud");

    expect(response?.status).toBe(400);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("fails closed when the Stripe price does not match the configured amount", async () => {
    const stripe = stripeDouble();
    stripe.prices.list.mockResolvedValue({
      data: [{ id: "price_wrong", currency: "cad", unit_amount: 1, recurring: { interval: "month" } }]
    });
    const response = await handleJobAgentRoute(checkoutRequest({
      userId,
      email: "candidate@example.com",
      customerId: null,
      planCode: "jobagent_monthly",
      idempotencyKey: "request-key-123",
      successUrl: "https://jobagent.unalabs.cloud/app?billing=success",
      cancelUrl: "https://jobagent.unalabs.cloud/app?billing=cancelled"
    }), environment(), stripe as unknown as Stripe, "https://jobagent.unalabs.cloud");

    expect(response?.status).toBe(502);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("bootstraps the approved catalog only with explicit authenticated confirmation", async () => {
    const stripe = stripeDouble();
    stripe.prices.list.mockResolvedValue({ data: [] });
    stripe.prices.create.mockImplementation(async (input) => ({
      id: `price_${input.metadata.plan_code}`,
      currency: input.currency,
      unit_amount: input.unit_amount,
      recurring: input.recurring
    }));
    stripe.promotionCodes.list.mockResolvedValue({ data: [] });
    stripe.coupons.retrieve.mockRejectedValue(Object.assign(new Error("missing"), { code: "resource_missing" }));
    stripe.coupons.create.mockResolvedValue({
      id: "jobagent_founding25_three_months",
      max_redemptions: 100,
      percent_off: 25,
      duration: "repeating",
      duration_in_months: 3
    });
    stripe.promotionCodes.create.mockResolvedValue({
      id: "promo_created",
      max_redemptions: 100,
      promotion: { type: "coupon", coupon: {
        id: "jobagent_founding25_three_months",
        max_redemptions: 100,
        percent_off: 25,
        duration: "repeating",
        duration_in_months: 3
      } }
    });
    const request = new Request("https://una-stripe-api.example/api/jobagent/catalog/bootstrap", {
      method: "POST",
      headers: { authorization: "Bearer shared-secret", "content-type": "application/json" },
      body: JSON.stringify({ confirm: "CREATE_JOBAGENT_STRIPE_CATALOG" })
    });

    const response = await handleJobAgentRoute(
      request,
      environment(),
      stripe as unknown as Stripe,
      "https://jobagent.unalabs.cloud"
    );

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toMatchObject({
      ready: true,
      promotionCode: "FOUNDING25",
      prices: [
        { planCode: "sprint_weekly", amountCadCents: 999, interval: "week" },
        { planCode: "jobagent_monthly", amountCadCents: 2999, interval: "month" },
        { planCode: "jobagent_annual", amountCadCents: 23999, interval: "year" }
      ]
    });
    expect(stripe.prices.create).toHaveBeenCalledTimes(3);
    expect(stripe.coupons.create).toHaveBeenCalledTimes(1);
    expect(stripe.promotionCodes.create).toHaveBeenCalledTimes(1);
  });

  it("normalizes only JobAgent-owned subscription events", async () => {
    const stripe = stripeDouble();
    const event = {
      id: "evt_jobagent_1",
      type: "customer.subscription.updated",
      created: 1_800_000_000,
      livemode: false,
      data: {
        object: {
          id: "sub_123",
          object: "subscription",
          customer: "cus_123",
          status: "active",
          metadata: {
            service_type: "jobagent_subscription",
            jobagent_user_id: userId,
            plan_code: "jobagent_monthly"
          },
          items: {
            data: [{
              current_period_start: 1_800_000_000,
              current_period_end: 1_802_678_400,
              price: { id: "price_monthly" }
            }]
          },
          cancel_at_period_end: false,
          canceled_at: null
        }
      }
    } as unknown as Stripe.Event;

    await expect(normalizeJobAgentStripeEvent(stripe as unknown as Stripe, event))
      .resolves.toMatchObject({
        stripeEventId: "evt_jobagent_1",
        userId,
        customerId: "cus_123",
        subscriptionId: "sub_123",
        planCode: "jobagent_monthly",
        entitlementStatus: "active"
      });
  });

  it("does not route another service through the JobAgent entitlement handler", async () => {
    const stripe = stripeDouble();
    const event = {
      id: "evt_other_service",
      type: "customer.subscription.updated",
      created: 1_800_000_000,
      livemode: false,
      data: { object: {
        id: "sub_other",
        object: "subscription",
        customer: "cus_other",
        status: "active",
        metadata: { service_type: "project_activation", jobagent_user_id: userId },
        items: { data: [] }
      } }
    } as unknown as Stripe.Event;

    await expect(normalizeJobAgentStripeEvent(stripe as unknown as Stripe, event)).resolves.toBeNull();
  });

  it("signs and forwards normalized events to the JobAgent API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const event: JobAgentBillingEvent = {
      stripeEventId: "evt_jobagent_2",
      eventType: "checkout.session.completed",
      eventCreatedAt: new Date().toISOString(),
      livemode: false,
      userId,
      stripeObjectId: "cs_test_2",
      customerId: "cus_2",
      subscriptionId: "sub_2",
      priceId: "price_monthly",
      planCode: "jobagent_monthly",
      subscriptionStatus: "active",
      entitlementStatus: "active",
      metadata: { service_type: "jobagent_subscription" }
    };

    await forwardJobAgentStripeEvent(environment(), event);

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe("https://jobagent.unalabs.cloud/api/v1/internal/billing/events");
    expect(request[1].headers["x-jobagent-signature"]).toMatch(/^[a-f0-9]{64}$/);
    expect(request[1].body).toBe(JSON.stringify(event));
  });
});
