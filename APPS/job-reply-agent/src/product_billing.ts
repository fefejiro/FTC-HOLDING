import crypto from "node:crypto";
import type pg from "pg";
import { z } from "zod";
import { withTenant } from "./product_db.js";
import {
  isPlanCode,
  planAllowances,
  type PlanAllowances,
  type PlanCode,
  type UsageKey
} from "./product_plans.js";

const BILLING_SIGNATURE_WINDOW_SECONDS = 300;
const entitlementStatuses = ["active", "past_due", "canceled", "suspended"] as const;

const billingEventSchema = z.object({
  stripeEventId: z.string().min(5).max(255),
  eventType: z.string().min(3).max(120),
  eventCreatedAt: z.string().datetime().optional(),
  livemode: z.boolean(),
  userId: z.string().uuid(),
  stripeObjectId: z.string().max(255).nullable().optional(),
  customerId: z.string().max(255).nullable().optional(),
  subscriptionId: z.string().max(255).nullable().optional(),
  priceId: z.string().max(255).nullable().optional(),
  planCode: z.enum([
    "free_preview", "sprint_weekly", "jobagent_monthly", "jobagent_annual"
  ]).optional(),
  subscriptionStatus: z.string().max(80).nullable().optional(),
  entitlementStatus: z.enum(entitlementStatuses).optional(),
  periodStart: z.string().datetime().nullable().optional(),
  periodEnd: z.string().datetime().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  canceledAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.string()).default({})
});

export type NormalizedBillingEvent = z.infer<typeof billingEventSchema>;

export interface BillingEntitlement {
  planCode: PlanCode;
  status: typeof entitlementStatuses[number];
  allowances: PlanAllowances;
  periodStart: string;
  periodEnd: string;
  source: "system" | "stripe" | "operator";
  stripeSubscriptionId: string | null;
}

function defaultPeriod(code: PlanCode, now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  if (code === "sprint_weekly") {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }
  start.setUTCDate(1);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function signBillingPayload(rawBody: string, timestamp: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function verifyBillingPayloadSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
  now = Date.now()
): boolean {
  const seconds = Number(timestamp);
  if (!secret || !Number.isInteger(seconds)) return false;
  if (Math.abs(Math.floor(now / 1000) - seconds) > BILLING_SIGNATURE_WINDOW_SECONDS) return false;
  return secureEqual(signBillingPayload(rawBody, timestamp, secret), signature.toLowerCase());
}

export function parseBillingEvent(value: unknown): NormalizedBillingEvent {
  return billingEventSchema.parse(value);
}

export async function ensureFreeEntitlement(
  db: pg.Pool,
  userId: string
): Promise<void> {
  const period = defaultPeriod("free_preview");
  await withTenant(userId, (client) => client.query(
    `INSERT INTO plan_entitlements
       (user_id, plan_code, status, allowances, source, period_start, period_end)
     VALUES ($1,'free_preview','active',$2::jsonb,'system',$3,$4)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, JSON.stringify(planAllowances("free_preview")), period.start, period.end]
  ), db);
}

export async function getBillingEntitlement(
  db: pg.Pool,
  userId: string
): Promise<BillingEntitlement> {
  await ensureFreeEntitlement(db, userId);
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT plan_code AS "planCode", status, allowances,
              period_start AS "periodStart", period_end AS "periodEnd",
              source, stripe_subscription_id AS "stripeSubscriptionId"
         FROM plan_entitlements WHERE user_id=$1`,
      [userId]
    );
    const row = result.rows[0];
    const planCode = isPlanCode(row?.planCode) ? row.planCode : "free_preview";
    const status = entitlementStatuses.includes(row?.status) ? row.status : "suspended";
    return {
      planCode,
      status,
      allowances: status === "active" ? row.allowances : planAllowances("free_preview"),
      periodStart: new Date(row.periodStart).toISOString(),
      periodEnd: new Date(row.periodEnd).toISOString(),
      source: row.source,
      stripeSubscriptionId: row.stripeSubscriptionId || null
    } as BillingEntitlement;
  }, db);
}

export async function getBillingCustomerId(db: pg.Pool, userId: string): Promise<string | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      "SELECT stripe_customer_id FROM billing_customers WHERE user_id=$1",
      [userId]
    );
    return result.rows[0]?.stripe_customer_id || null;
  }, db);
}

export async function saveBillingCustomer(
  db: pg.Pool,
  userId: string,
  stripeCustomerId: string,
  livemode: boolean
): Promise<void> {
  await withTenant(userId, (client) => client.query(
    `INSERT INTO billing_customers (user_id, stripe_customer_id, livemode)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id) DO UPDATE
       SET stripe_customer_id=EXCLUDED.stripe_customer_id,
           livemode=EXCLUDED.livemode,
           updated_at=now()`,
    [userId, stripeCustomerId, livemode]
  ), db);
}

export async function recordFunnelEvent(
  db: pg.Pool,
  userId: string,
  eventName: string,
  properties: Record<string, unknown> = {},
  eventKey = `${eventName}:${crypto.randomUUID()}`
): Promise<void> {
  await withTenant(userId, (client) => client.query(
    `INSERT INTO product_funnel_events (user_id, event_key, event_name, properties)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (user_id, event_key) DO NOTHING`,
    [userId, eventKey, eventName, JSON.stringify(properties)]
  ), db);
}

export async function billingUsageSummary(db: pg.Pool, userId: string) {
  const entitlement = await getBillingEntitlement(db, userId);
  return withTenant(userId, async (client) => {
    const result = await client.query<{ usageKey: UsageKey; used: number }>(
      `SELECT usage_key AS "usageKey", sum(quantity)::integer AS used
         FROM usage_ledger
        WHERE user_id=$1 AND occurred_at >= $2 AND occurred_at < $3
        GROUP BY usage_key`,
      [userId, entitlement.periodStart, entitlement.periodEnd]
    );
    const used = Object.fromEntries(result.rows.map((row) => [row.usageKey, row.used]));
    const usage = Object.fromEntries(
      Object.entries(entitlement.allowances).map(([key, limit]) => [
        key,
        { used: Number(used[key] || 0), limit, remaining: Math.max(0, limit - Number(used[key] || 0)) }
      ])
    );
    return { entitlement, usage };
  }, db);
}

export async function consumePlanUsage(
  db: pg.Pool,
  userId: string,
  usageKey: UsageKey,
  quantity: number,
  idempotencyKey: string,
  metadata: Record<string, unknown> = {}
): Promise<{ allowed: boolean; replayed: boolean; used: number; limit: number; remaining: number }> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Usage quantity must be positive.");
  const entitlement = await getBillingEntitlement(db, userId);
  const limit = entitlement.allowances[usageKey];
  return withTenant(userId, async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`jobagent-usage:${userId}:${usageKey}:${entitlement.periodStart}`]
    );
    const replay = await client.query(
      `SELECT quantity FROM usage_ledger WHERE user_id=$1 AND idempotency_key=$2`,
      [userId, idempotencyKey]
    );
    const total = await client.query<{ used: number }>(
      `SELECT COALESCE(sum(quantity),0)::integer AS used
         FROM usage_ledger
        WHERE user_id=$1 AND usage_key=$2 AND occurred_at >= $3 AND occurred_at < $4`,
      [userId, usageKey, entitlement.periodStart, entitlement.periodEnd]
    );
    const used = Number(total.rows[0]?.used || 0);
    if (replay.rows[0]) {
      return { allowed: true, replayed: true, used, limit, remaining: Math.max(0, limit - used) };
    }
    if (used + quantity > limit) {
      return { allowed: false, replayed: false, used, limit, remaining: Math.max(0, limit - used) };
    }
    await client.query(
      `INSERT INTO usage_ledger
         (user_id, usage_key, quantity, idempotency_key, period_start, metadata)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      [
        userId,
        usageKey,
        quantity,
        idempotencyKey,
        entitlement.periodStart,
        JSON.stringify(metadata)
      ]
    );
    return {
      allowed: true,
      replayed: false,
      used: used + quantity,
      limit,
      remaining: Math.max(0, limit - used - quantity)
    };
  }, db);
}

function normalizedSubscriptionStatus(value: unknown): string {
  const status = String(value || "incomplete").toLowerCase();
  return [
    "incomplete", "incomplete_expired", "trialing", "active", "past_due",
    "canceled", "unpaid", "paused", "suspended"
  ].includes(status) ? status : "incomplete";
}

function derivedEntitlementStatus(event: NormalizedBillingEvent) {
  if (event.entitlementStatus) return event.entitlementStatus;
  if (event.eventType === "invoice.payment_failed") return "past_due" as const;
  if (event.eventType === "customer.subscription.deleted") return "canceled" as const;
  if (event.eventType.startsWith("charge.refund") || event.eventType.startsWith("charge.dispute")) {
    return "suspended" as const;
  }
  return ["past_due", "unpaid"].includes(String(event.subscriptionStatus))
    ? "past_due" as const
    : ["canceled", "incomplete_expired"].includes(String(event.subscriptionStatus))
      ? "canceled" as const
      : "active" as const;
}

export async function applyBillingEvent(
  db: pg.Pool,
  rawEvent: unknown,
  payloadDigest: string
): Promise<{ replayed: boolean; entitlement: BillingEntitlement }> {
  const event = parseBillingEvent(rawEvent);
  return withTenant(event.userId, async (client) => {
    const inserted = await client.query(
      `INSERT INTO billing_events
         (stripe_event_id, user_id, event_type, stripe_object_id, payload_digest,
          livemode, normalized_payload, event_created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING stripe_event_id`,
      [
        event.stripeEventId,
        event.userId,
        event.eventType,
        event.stripeObjectId || null,
        payloadDigest,
        event.livemode,
        JSON.stringify(event),
        event.eventCreatedAt || null
      ]
    );
    if (!inserted.rows[0]) {
      const existing = await client.query(
        `SELECT plan_code AS "planCode", status, allowances,
                period_start AS "periodStart", period_end AS "periodEnd", source,
                stripe_subscription_id AS "stripeSubscriptionId"
           FROM plan_entitlements WHERE user_id=$1`,
        [event.userId]
      );
      const row = existing.rows[0];
      return {
        replayed: true,
        entitlement: {
          planCode: row?.planCode || "free_preview",
          status: row?.status || "active",
          allowances: row?.status === "active" ? row.allowances : planAllowances("free_preview"),
          periodStart: new Date(row?.periodStart || defaultPeriod("free_preview").start).toISOString(),
          periodEnd: new Date(row?.periodEnd || defaultPeriod("free_preview").end).toISOString(),
          source: row?.source || "system",
          stripeSubscriptionId: row?.stripeSubscriptionId || null
        }
      };
    }

    const current = await client.query(
      `SELECT plan_code AS "planCode" FROM plan_entitlements WHERE user_id=$1`,
      [event.userId]
    );
    const planCode: PlanCode = event.planCode
      || (isPlanCode(current.rows[0]?.planCode) ? current.rows[0].planCode : "free_preview");
    const bounds = defaultPeriod(planCode);
    const periodStart = event.periodStart ? new Date(event.periodStart) : bounds.start;
    const periodEnd = event.periodEnd ? new Date(event.periodEnd) : bounds.end;
    const entitlementStatus = derivedEntitlementStatus(event);

    if (event.customerId) {
      await client.query(
        `INSERT INTO billing_customers (user_id, stripe_customer_id, livemode)
         VALUES ($1,$2,$3)
         ON CONFLICT (user_id) DO UPDATE
           SET stripe_customer_id=EXCLUDED.stripe_customer_id,
               livemode=EXCLUDED.livemode,
               updated_at=now()`,
        [event.userId, event.customerId, event.livemode]
      );
    }
    if (event.subscriptionId && event.customerId) {
      await client.query(
        `INSERT INTO billing_subscriptions
           (user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id,
            plan_code, status, current_period_start, current_period_end,
            cancel_at_period_end, canceled_at, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
         ON CONFLICT (stripe_subscription_id) DO UPDATE
           SET stripe_price_id=EXCLUDED.stripe_price_id,
               plan_code=EXCLUDED.plan_code,
               status=EXCLUDED.status,
               current_period_start=EXCLUDED.current_period_start,
               current_period_end=EXCLUDED.current_period_end,
               cancel_at_period_end=EXCLUDED.cancel_at_period_end,
               canceled_at=EXCLUDED.canceled_at,
               metadata=EXCLUDED.metadata,
               updated_at=now()`,
        [
          event.userId,
          event.subscriptionId,
          event.customerId,
          event.priceId || null,
          planCode,
          normalizedSubscriptionStatus(event.subscriptionStatus),
          periodStart,
          periodEnd,
          Boolean(event.cancelAtPeriodEnd),
          event.canceledAt || null,
          JSON.stringify(event.metadata)
        ]
      );
    }
    await client.query(
      `INSERT INTO plan_entitlements
         (user_id, plan_code, status, allowances, source, stripe_subscription_id,
          period_start, period_end)
       VALUES ($1,$2,$3,$4::jsonb,'stripe',$5,$6,$7)
       ON CONFLICT (user_id) DO UPDATE
         SET plan_code=EXCLUDED.plan_code,
             status=EXCLUDED.status,
             allowances=EXCLUDED.allowances,
             source='stripe',
             stripe_subscription_id=EXCLUDED.stripe_subscription_id,
             period_start=EXCLUDED.period_start,
             period_end=EXCLUDED.period_end,
             updated_at=now()`,
      [
        event.userId,
        planCode,
        entitlementStatus,
        JSON.stringify(planAllowances(planCode)),
        event.subscriptionId || null,
        periodStart,
        periodEnd
      ]
    );
    await client.query(
      `UPDATE billing_events
          SET processing_status='processed', processed_at=now()
        WHERE stripe_event_id=$1 AND user_id=$2`,
      [event.stripeEventId, event.userId]
    );
    const funnelEvent = event.eventType === "checkout.session.completed"
      ? "checkout_completed"
      : entitlementStatus === "active"
        ? "subscription_activated"
        : entitlementStatus === "canceled"
          ? "subscription_canceled"
          : null;
    if (funnelEvent) {
      await client.query(
        `INSERT INTO product_funnel_events (user_id, event_key, event_name, properties)
         VALUES ($1,$2,$3,$4::jsonb)
         ON CONFLICT (user_id, event_key) DO NOTHING`,
        [
          event.userId,
          `stripe:${event.stripeEventId}:${funnelEvent}`,
          funnelEvent,
          JSON.stringify({ planCode, stripeEventId: event.stripeEventId })
        ]
      );
    }
    return {
      replayed: false,
      entitlement: {
        planCode,
        status: entitlementStatus,
        allowances: entitlementStatus === "active"
          ? planAllowances(planCode)
          : planAllowances("free_preview"),
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        source: "stripe",
        stripeSubscriptionId: event.subscriptionId || null
      }
    };
  }, db);
}

function gatewayConfig() {
  const url = String(process.env.JOBAGENT_BILLING_GATEWAY_URL || "").replace(/\/+$/, "");
  const secret = String(process.env.JOBAGENT_BILLING_SHARED_SECRET || "").trim();
  if (!url.startsWith("https://") || !secret) {
    throw new Error("JobAgent billing gateway is not configured.");
  }
  return { url, secret };
}

async function gatewayRequest(pathname: string, body: Record<string, unknown>) {
  const { url, secret } = gatewayConfig();
  const response = await fetch(`${url}${pathname}`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${secret}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.error || "Billing gateway request failed."));
  return payload;
}

function trustedStripeUrl(value: unknown, expectedHost: string): string {
  const parsed = new URL(String(value || ""));
  if (parsed.protocol !== "https:" || parsed.hostname !== expectedHost) {
    throw new Error("Billing gateway returned an untrusted destination.");
  }
  return parsed.toString();
}

export async function createBillingCheckout(
  db: pg.Pool,
  user: { id: string; email: string },
  planCode: Exclude<PlanCode, "free_preview">,
  idempotencyKey: string
) {
  const appOrigin = String(process.env.APP_ORIGIN || "").replace(/\/+$/, "");
  if (!appOrigin.startsWith("https://") && process.env.NODE_ENV === "production") {
    throw new Error("HTTPS application origin is required for billing.");
  }
  const customerId = await getBillingCustomerId(db, user.id);
  const payload = await gatewayRequest("/api/jobagent/checkout", {
    userId: user.id,
    email: user.email,
    customerId,
    planCode,
    idempotencyKey,
    successUrl: `${appOrigin}/app?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appOrigin}/app?billing=cancelled`
  });
  if (payload.customerId) {
    await saveBillingCustomer(db, user.id, String(payload.customerId), Boolean(payload.livemode));
  }
  await recordFunnelEvent(
    db,
    user.id,
    "checkout_started",
    { planCode },
    `checkout:${idempotencyKey}`
  );
  return {
    url: trustedStripeUrl(payload.url, "checkout.stripe.com"),
    sessionId: String(payload.sessionId || "")
  };
}

export async function createBillingPortal(db: pg.Pool, userId: string) {
  const appOrigin = String(process.env.APP_ORIGIN || "").replace(/\/+$/, "");
  const customerId = await getBillingCustomerId(db, userId);
  if (!customerId) throw new Error("No billing account is linked to this user.");
  const payload = await gatewayRequest("/api/jobagent/portal", {
    userId,
    customerId,
    returnUrl: `${appOrigin}/app?billing=portal-return`
  });
  return { url: trustedStripeUrl(payload.url, "billing.stripe.com") };
}
