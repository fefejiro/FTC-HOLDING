import { afterEach, describe, expect, it } from "vitest";
import {
  parseBillingEvent,
  signBillingPayload,
  verifyBillingPayloadSignature
} from "../src/product_billing.js";
import { billingCheckoutEnabled, publicPlans } from "../src/product_plans.js";

const configurable = [
  "JOBAGENT_SPRINT_WEEKLY_CAD_CENTS",
  "JOBAGENT_MONTHLY_CAD_CENTS",
  "JOBAGENT_ANNUAL_CAD_CENTS",
  "JOBAGENT_FREE_PREVIEW_FIT_ANALYSES",
  "BILLING_CHECKOUT_ENABLED"
] as const;
const original = Object.fromEntries(configurable.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of configurable) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("JobAgent commercial plans", () => {
  it("keeps paid checkout disabled unless production explicitly enables it", () => {
    delete process.env.BILLING_CHECKOUT_ENABLED;
    expect(billingCheckoutEnabled()).toBe(false);
    process.env.BILLING_CHECKOUT_ENABLED = "true";
    expect(billingCheckoutEnabled()).toBe(true);
  });

  it("publishes the approved launch prices and allowances", () => {
    for (const key of configurable) delete process.env[key];
    const plans = Object.fromEntries(publicPlans().map((plan) => [plan.code, plan]));

    expect(plans.free_preview.amountCadCents).toBe(0);
    expect(plans.free_preview.allowances).toMatchObject({ fit_analysis: 3, tailored_package: 1 });
    expect(plans.sprint_weekly).toMatchObject({ amountCadCents: 999, interval: "week" });
    expect(plans.sprint_weekly.allowances).toMatchObject({ fit_analysis: 15, tailored_package: 5 });
    expect(plans.jobagent_monthly).toMatchObject({ amountCadCents: 2999, interval: "month" });
    expect(plans.jobagent_monthly.allowances).toMatchObject({ fit_analysis: 100, tailored_package: 25 });
    expect(plans.jobagent_annual).toMatchObject({ amountCadCents: 23999, interval: "year" });
  });

  it("allows server-side pricing and allowance changes without a new client build", () => {
    process.env.JOBAGENT_MONTHLY_CAD_CENTS = "3499";
    process.env.JOBAGENT_FREE_PREVIEW_FIT_ANALYSES = "4";
    const plans = Object.fromEntries(publicPlans().map((plan) => [plan.code, plan]));
    expect(plans.jobagent_monthly.amountCadCents).toBe(3499);
    expect(plans.free_preview.allowances.fit_analysis).toBe(4);
  });
});

describe("billing event authentication", () => {
  it("accepts a current valid HMAC and rejects tampering or replay outside the window", () => {
    const raw = JSON.stringify({ stripeEventId: "evt_test_123" });
    const timestamp = "1800000000";
    const secret = "shared-billing-secret";
    const signature = signBillingPayload(raw, timestamp, secret);
    const now = 1_800_000_000_000;

    expect(verifyBillingPayloadSignature(raw, timestamp, signature, secret, now)).toBe(true);
    expect(verifyBillingPayloadSignature(`${raw} `, timestamp, signature, secret, now)).toBe(false);
    expect(verifyBillingPayloadSignature(raw, timestamp, signature, secret, now + 301_000)).toBe(false);
  });

  it("validates the normalized Stripe event contract", () => {
    expect(parseBillingEvent({
      stripeEventId: "evt_test_456",
      eventType: "customer.subscription.updated",
      livemode: false,
      userId: "5a79c30a-f59a-4f5a-a625-d3d6bffba002",
      planCode: "jobagent_monthly",
      metadata: {}
    })).toMatchObject({ planCode: "jobagent_monthly" });
    expect(() => parseBillingEvent({
      stripeEventId: "evt_test_456",
      eventType: "customer.subscription.updated",
      livemode: false,
      userId: "another-tenant",
      planCode: "unlimited"
    })).toThrow();
  });
});
