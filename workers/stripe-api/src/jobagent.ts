import Stripe from 'stripe';
import type { Env } from './index';

const PLAN_CODES = ['sprint_weekly', 'jobagent_monthly', 'jobagent_annual'] as const;
type PaidPlanCode = typeof PLAN_CODES[number];
const BILLING_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
]);

const DEFAULT_LOOKUP_KEYS: Record<PaidPlanCode, string> = {
  sprint_weekly: 'jobagent_sprint_weekly_cad',
  jobagent_monthly: 'jobagent_monthly_cad',
  jobagent_annual: 'jobagent_annual_cad',
};

const DEFAULT_CAD_CENTS: Record<PaidPlanCode, number> = {
  sprint_weekly: 999,
  jobagent_monthly: 2999,
  jobagent_annual: 23999,
};

interface CheckoutInput {
  userId: string;
  email: string;
  customerId: string | null;
  planCode: PaidPlanCode;
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
}

const PLAN_NAMES: Record<PaidPlanCode, string> = {
  sprint_weekly: 'JobAgent Job Search Sprint',
  jobagent_monthly: 'JobAgent Monthly',
  jobagent_annual: 'JobAgent Annual',
};

export interface JobAgentBillingEvent {
  stripeEventId: string;
  eventType: string;
  eventCreatedAt: string;
  livemode: boolean;
  userId: string;
  stripeObjectId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  priceId: string | null;
  planCode?: PaidPlanCode;
  subscriptionStatus?: string | null;
  entitlementStatus?: 'active' | 'past_due' | 'canceled' | 'suspended';
  periodStart?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  metadata: Record<string, string>;
}

function response(data: unknown, status = 200, origin: string | null = null): Response {
  const allowedOrigin = origin === 'https://jobagent.unalabs.cloud'
    ? origin
    : 'https://jobagent.unalabs.cloud';
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': allowedOrigin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization',
      'cache-control': 'no-store',
    },
  });
}

function clean(value: unknown, maximum = 500): string {
  return String(value ?? '').trim().slice(0, maximum);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function objectId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  return clean(asRecord(value).id, 255) || null;
}

function metadata(value: unknown): Record<string, string> {
  const source = asRecord(value);
  return Object.fromEntries(
    Object.entries(source)
      .map(([key, item]) => [clean(key, 80), clean(item, 500)])
      .filter(([key, item]) => key && item)
  );
}

function constantEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function authorized(req: Request, env: Env): boolean {
  const expected = clean(env.JOBAGENT_BILLING_SHARED_SECRET, 500);
  const actual = clean(req.headers.get('authorization'), 600);
  return Boolean(expected) && constantEqual(actual, `Bearer ${expected}`);
}

function applicationOrigin(env: Env): string {
  return clean(env.JOBAGENT_APP_ORIGIN || 'https://jobagent.unalabs.cloud', 500).replace(/\/+$/, '');
}

function safeReturnUrl(value: unknown, env: Env): string | null {
  try {
    const url = new URL(clean(value, 1000));
    return url.origin === applicationOrigin(env) ? url.toString() : null;
  } catch {
    return null;
  }
}

function lookupKey(env: Env, planCode: PaidPlanCode): string {
  const configured: Partial<Record<PaidPlanCode, string | undefined>> = {
    sprint_weekly: env.JOBAGENT_SPRINT_WEEKLY_LOOKUP_KEY,
    jobagent_monthly: env.JOBAGENT_MONTHLY_LOOKUP_KEY,
    jobagent_annual: env.JOBAGENT_ANNUAL_LOOKUP_KEY,
  };
  return clean(configured[planCode] || DEFAULT_LOOKUP_KEYS[planCode], 255);
}

function expectedCadCents(env: Env, planCode: PaidPlanCode): number {
  const configured: Partial<Record<PaidPlanCode, string | undefined>> = {
    sprint_weekly: env.JOBAGENT_SPRINT_WEEKLY_CAD_CENTS,
    jobagent_monthly: env.JOBAGENT_MONTHLY_CAD_CENTS,
    jobagent_annual: env.JOBAGENT_ANNUAL_CAD_CENTS,
  };
  const value = Number(configured[planCode] || DEFAULT_CAD_CENTS[planCode]);
  if (!Number.isInteger(value) || value < 100) throw new Error(`The configured amount for ${planCode} is invalid.`);
  return value;
}

function parseCheckoutInput(value: unknown, env: Env): CheckoutInput | null {
  const body = asRecord(value);
  const planCode = clean(body.planCode) as PaidPlanCode;
  const successUrl = safeReturnUrl(body.successUrl, env);
  const cancelUrl = safeReturnUrl(body.cancelUrl, env);
  const input = {
    userId: clean(body.userId, 36),
    email: clean(body.email, 320).toLowerCase(),
    customerId: clean(body.customerId, 255) || null,
    planCode,
    idempotencyKey: clean(body.idempotencyKey, 200),
    successUrl: successUrl || '',
    cancelUrl: cancelUrl || '',
  };
  if (!/^[0-9a-f-]{36}$/i.test(input.userId)
      || !/^\S+@\S+\.\S+$/.test(input.email)
      || !PLAN_CODES.includes(input.planCode)
      || input.idempotencyKey.length < 8
      || !input.successUrl
      || !input.cancelUrl) return null;
  return input;
}

async function resolvePrice(stripe: Stripe, env: Env, planCode: PaidPlanCode): Promise<Stripe.Price> {
  const key = lookupKey(env, planCode);
  const prices = await stripe.prices.list({ active: true, lookup_keys: [key], limit: 1 });
  const price = prices.data[0];
  if (!price || price.currency !== 'cad' || !price.recurring) {
    throw new Error(`The Stripe price for ${planCode} is not configured.`);
  }
  const expectedInterval = planCode === 'sprint_weekly'
    ? 'week'
    : planCode === 'jobagent_annual' ? 'year' : 'month';
  if (price.recurring.interval !== expectedInterval) {
    throw new Error(`The Stripe interval for ${planCode} is invalid.`);
  }
  if (price.unit_amount !== expectedCadCents(env, planCode)) {
    throw new Error(`The Stripe amount for ${planCode} does not match the configured launch price.`);
  }
  return price;
}

async function ensurePrice(stripe: Stripe, env: Env, planCode: PaidPlanCode): Promise<Stripe.Price> {
  const key = lookupKey(env, planCode);
  const existing = await stripe.prices.list({ active: true, lookup_keys: [key], limit: 1 });
  if (existing.data[0]) return resolvePrice(stripe, env, planCode);
  const interval = planCode === 'sprint_weekly'
    ? 'week'
    : planCode === 'jobagent_annual' ? 'year' : 'month';
  return stripe.prices.create({
    currency: 'cad',
    unit_amount: expectedCadCents(env, planCode),
    recurring: { interval },
    lookup_key: key,
    nickname: PLAN_NAMES[planCode],
    product_data: {
      name: PLAN_NAMES[planCode],
      metadata: { service_type: 'jobagent_subscription', plan_code: planCode },
    },
    metadata: { service_type: 'jobagent_subscription', plan_code: planCode },
  }, { idempotencyKey: `jobagent:catalog:price:${planCode}:${expectedCadCents(env, planCode)}` });
}

async function resolveCustomer(
  stripe: Stripe,
  input: CheckoutInput
): Promise<Stripe.Customer> {
  if (input.customerId) {
    const existing = await stripe.customers.retrieve(input.customerId);
    if (!('deleted' in existing) || !existing.deleted) {
      if (existing.metadata.jobagent_user_id !== input.userId) {
        throw new Error('Billing customer identity does not match the JobAgent user.');
      }
      return existing;
    }
  }
  return stripe.customers.create({
    email: input.email,
    metadata: {
      service_type: 'jobagent_subscription',
      jobagent_user_id: input.userId,
    },
  }, { idempotencyKey: `jobagent:customer:${input.userId}` });
}

async function validateFoundingPromotion(stripe: Stripe, promotion: Stripe.PromotionCode): Promise<string> {
  const couponRef = promotion.promotion.coupon;
  const coupon = typeof couponRef === 'string'
    ? await stripe.coupons.retrieve(couponRef)
    : couponRef;
  if (!coupon) throw new Error('The founding promotion coupon is unavailable.');
  if (promotion.max_redemptions !== 100
      || coupon.max_redemptions !== 100
      || coupon.percent_off !== 25
      || coupon.duration !== 'repeating'
      || coupon.duration_in_months !== 3) {
    throw new Error('The founding promotion does not match the approved offer.');
  }
  return promotion.id;
}

async function foundingPromotion(stripe: Stripe, env: Env): Promise<string> {
  const code = clean(env.JOBAGENT_FOUNDING_PROMOTION_CODE || 'FOUNDING25', 100);
  const promotions = await stripe.promotionCodes.list({ active: true, code, limit: 1 });
  const promotion = promotions.data[0];
  if (!promotion) throw new Error('The founding promotion is not configured.');
  return validateFoundingPromotion(stripe, promotion);
}

async function ensureFoundingPromotion(stripe: Stripe, env: Env): Promise<string> {
  const code = clean(env.JOBAGENT_FOUNDING_PROMOTION_CODE || 'FOUNDING25', 100);
  const promotions = await stripe.promotionCodes.list({ active: true, code, limit: 1 });
  if (promotions.data[0]) return validateFoundingPromotion(stripe, promotions.data[0]);
  const couponId = 'jobagent_founding25_three_months';
  let coupon: Stripe.Coupon;
  try {
    const found = await stripe.coupons.retrieve(couponId);
    if ('deleted' in found && found.deleted) throw new Error('The founding coupon was deleted.');
    coupon = found;
  } catch (error) {
    const codeValue = clean(asRecord(error).code, 80);
    if (codeValue !== 'resource_missing') throw error;
    coupon = await stripe.coupons.create({
      id: couponId,
      name: 'JobAgent Founding Access - 25% for 3 months',
      percent_off: 25,
      duration: 'repeating',
      duration_in_months: 3,
      max_redemptions: 100,
      metadata: { service_type: 'jobagent_subscription', offer: 'FOUNDING25' },
    }, { idempotencyKey: 'jobagent:catalog:coupon:founding25:v1' });
  }
  const promotion = await stripe.promotionCodes.create({
    code,
    active: true,
    max_redemptions: 100,
    promotion: { type: 'coupon', coupon: coupon.id },
    metadata: { service_type: 'jobagent_subscription', offer: 'FOUNDING25' },
  }, { idempotencyKey: 'jobagent:catalog:promotion:founding25:v1' });
  return validateFoundingPromotion(stripe, promotion);
}

async function handleCatalogStatus(req: Request, env: Env, stripe: Stripe, origin: string | null) {
  if (!authorized(req, env)) return response({ error: 'Unauthorized.' }, 401, origin);
  try {
    const prices = await Promise.all(PLAN_CODES.map(async (planCode) => {
      const price = await resolvePrice(stripe, env, planCode);
      return { planCode, priceId: price.id, amountCadCents: price.unit_amount, interval: price.recurring?.interval };
    }));
    const promotionId = await foundingPromotion(stripe, env);
    return response({ ready: true, prices, promotionCode: 'FOUNDING25', promotionId }, 200, origin);
  } catch (error) {
    return response({ ready: false, error: error instanceof Error ? error.message : 'Catalog is not ready.' }, 409, origin);
  }
}

async function handleCatalogBootstrap(req: Request, env: Env, stripe: Stripe, origin: string | null) {
  if (!authorized(req, env)) return response({ error: 'Unauthorized.' }, 401, origin);
  const body = asRecord(await req.json().catch(() => ({})));
  if (body.confirm !== 'CREATE_JOBAGENT_STRIPE_CATALOG') {
    return response({ error: 'Catalog creation confirmation is required.' }, 400, origin);
  }
  try {
    const prices = await Promise.all(PLAN_CODES.map(async (planCode) => {
      const price = await ensurePrice(stripe, env, planCode);
      return { planCode, priceId: price.id, amountCadCents: price.unit_amount, interval: price.recurring?.interval };
    }));
    const promotionId = await ensureFoundingPromotion(stripe, env);
    return response({ ready: true, prices, promotionCode: 'FOUNDING25', promotionId }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'jobagent_catalog_bootstrap_failed',
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    }));
    return response({ error: error instanceof Error ? error.message : 'Catalog bootstrap failed.' }, 409, origin);
  }
}

async function handleCheckout(req: Request, env: Env, stripe: Stripe, origin: string | null) {
  if (!authorized(req, env)) return response({ error: 'Unauthorized.' }, 401, origin);
  let raw: unknown;
  try { raw = await req.json(); } catch { return response({ error: 'Invalid request body.' }, 400, origin); }
  const input = parseCheckoutInput(raw, env);
  if (!input) return response({ error: 'Checkout request is invalid.' }, 400, origin);

  try {
    const [price, customer] = await Promise.all([
      resolvePrice(stripe, env, input.planCode),
      resolveCustomer(stripe, input),
    ]);
    const checkoutMetadata = {
      service_type: 'jobagent_subscription',
      jobagent_user_id: input.userId,
      plan_code: input.planCode,
    };
    const promotionId = input.planCode === 'jobagent_monthly'
      ? await foundingPromotion(stripe, env)
      : null;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      client_reference_id: input.userId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: checkoutMetadata,
      subscription_data: { metadata: checkoutMetadata },
      ...(promotionId
        ? { discounts: [{ promotion_code: promotionId }] }
        : { allow_promotion_codes: true }),
      billing_address_collection: 'auto',
      locale: 'en',
    }, { idempotencyKey: `jobagent:checkout:${input.userId}:${input.idempotencyKey}` });
    return response({
      url: session.url,
      sessionId: session.id,
      customerId: customer.id,
      livemode: session.livemode,
    }, 201, origin);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'jobagent_checkout_failed',
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    }));
    return response({ error: error instanceof Error ? error.message : 'Checkout failed.' }, 502, origin);
  }
}

async function handlePortal(req: Request, env: Env, stripe: Stripe, origin: string | null) {
  if (!authorized(req, env)) return response({ error: 'Unauthorized.' }, 401, origin);
  let body: Record<string, unknown>;
  try { body = asRecord(await req.json()); } catch { return response({ error: 'Invalid request body.' }, 400, origin); }
  const userId = clean(body.userId, 36);
  const customerId = clean(body.customerId, 255);
  const returnUrl = safeReturnUrl(body.returnUrl, env);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !customerId || !returnUrl) {
    return response({ error: 'Portal request is invalid.' }, 400, origin);
  }
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ('deleted' in customer && customer.deleted) throw new Error('Billing customer is deleted.');
    if (customer.metadata.jobagent_user_id !== userId) {
      return response({ error: 'Billing customer identity mismatch.' }, 403, origin);
    }
    const portal = await stripe.billingPortal.sessions.create({ customer: customer.id, return_url: returnUrl });
    return response({ url: portal.url }, 200, origin);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Portal request failed.' }, 502, origin);
  }
}

async function handleEmail(req: Request, env: Env, origin: string | null) {
  if (!authorized(req, env)) return response({ error: 'Unauthorized.' }, 401, origin);
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) {
    return response({ error: 'Transactional email is not configured.' }, 503, origin);
  }
  let body: Record<string, unknown>;
  try { body = asRecord(await req.json()); } catch { return response({ error: 'Invalid request body.' }, 400, origin); }
  const to = clean(body.to, 320).toLowerCase();
  const subject = clean(body.subject, 180);
  const text = clean(body.text, 20_000);
  const html = clean(body.html, 50_000);
  if (!/^\S+@\S+\.\S+$/.test(to) || !subject || !text || !html) {
    return response({ error: 'Email request is invalid.' }, 400, origin);
  }
  const sender = clean(env.JOBAGENT_EMAIL_FROM || 'jobagent@unalabs.cloud', 320);
  const credentials = btoa(`${clean(env.MAILJET_API_KEY, 500)}:${clean(env.MAILJET_SECRET_KEY, 500)}`);
  const delivery = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      Messages: [{
        From: { Email: sender, Name: 'Una Labs JobAgent' },
        To: [{ Email: to }],
        Subject: subject,
        TextPart: text,
        HTMLPart: html,
      }],
    }),
  });
  const payload = await delivery.json().catch(() => ({})) as Record<string, unknown>;
  if (!delivery.ok) return response({ error: 'Mailjet rejected the message.' }, 502, origin);
  const message = asRecord((payload.Messages as unknown[])?.[0]);
  const recipient = asRecord((message.To as unknown[])?.[0]);
  return response({ id: clean(recipient.MessageID, 255) || crypto.randomUUID() }, 202, origin);
}

export async function handleJobAgentRoute(
  req: Request,
  env: Env,
  stripe: Stripe,
  origin: string | null
): Promise<Response | null> {
  const pathname = new URL(req.url).pathname;
  if (!pathname.startsWith('/api/jobagent/')) return null;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return response({ error: 'Method not allowed.' }, 405, origin);
  if (pathname === '/api/jobagent/checkout') return handleCheckout(req, env, stripe, origin);
  if (pathname === '/api/jobagent/portal') return handlePortal(req, env, stripe, origin);
  if (pathname === '/api/jobagent/email') return handleEmail(req, env, origin);
  if (pathname === '/api/jobagent/catalog/status') return handleCatalogStatus(req, env, stripe, origin);
  if (pathname === '/api/jobagent/catalog/bootstrap') return handleCatalogBootstrap(req, env, stripe, origin);
  return response({ error: 'Not found.' }, 404, origin);
}

function secondsToIso(value: unknown): string | null {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

function statusFor(eventType: string, subscriptionStatus: string | null) {
  if (eventType === 'invoice.payment_failed') return 'past_due' as const;
  if (eventType === 'customer.subscription.deleted') return 'canceled' as const;
  if (eventType.startsWith('charge.refund') || eventType.startsWith('charge.dispute')) {
    return 'suspended' as const;
  }
  if (['past_due', 'unpaid'].includes(subscriptionStatus || '')) return 'past_due' as const;
  if (['canceled', 'incomplete_expired'].includes(subscriptionStatus || '')) return 'canceled' as const;
  return 'active' as const;
}

async function jobAgentContext(
  stripe: Stripe,
  source: Record<string, unknown>
): Promise<{
  context: Record<string, string>;
  customerId: string | null;
  subscription: Stripe.Subscription | null;
}> {
  let context = metadata(source.metadata);
  let customerId = objectId(source.customer);
  let subscriptionId = source.object === 'subscription'
    ? objectId(source.id)
    : objectId(source.subscription)
    || objectId(asRecord(asRecord(source.parent).subscription_details).subscription);
  let subscription: Stripe.Subscription | null = null;
  if (source.object === 'subscription') {
    subscription = source as unknown as Stripe.Subscription;
    customerId ||= objectId(source.customer);
  } else if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    context = { ...metadata(subscription.metadata), ...context };
    customerId ||= objectId(subscription.customer);
  }
  const paymentIntentId = objectId(source.payment_intent);
  if (!context.jobagent_user_id && paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    context = { ...metadata(paymentIntent.metadata), ...context };
    customerId ||= objectId(paymentIntent.customer);
  }
  if (!context.jobagent_user_id && customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!('deleted' in customer) || !customer.deleted) {
      context = { ...metadata(customer.metadata), ...context };
    }
  }
  return { context, customerId, subscription };
}

export async function normalizeJobAgentStripeEvent(
  stripe: Stripe,
  event: Stripe.Event
): Promise<JobAgentBillingEvent | null> {
  if (!BILLING_EVENT_TYPES.has(event.type)) return null;
  const source = asRecord(event.data.object);
  const resolved = await jobAgentContext(stripe, source);
  if (resolved.context.service_type !== 'jobagent_subscription'
      || !resolved.context.jobagent_user_id) return null;
  const userId = clean(resolved.context.jobagent_user_id, 36);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const subscription = resolved.subscription;
  const subscriptionRecord = asRecord(subscription);
  const firstItem = asRecord((asRecord(subscriptionRecord.items).data as unknown[])?.[0]);
  const price = asRecord(firstItem.price);
  const planCode = clean(resolved.context.plan_code) as PaidPlanCode;
  const subscriptionStatus = clean(subscriptionRecord.status, 80) || null;
  return {
    stripeEventId: event.id,
    eventType: event.type,
    eventCreatedAt: new Date(event.created * 1000).toISOString(),
    livemode: event.livemode,
    userId,
    stripeObjectId: clean(source.id, 255) || null,
    customerId: resolved.customerId,
    subscriptionId: objectId(subscription) || objectId(source.subscription),
    priceId: clean(price.id, 255) || null,
    ...(PLAN_CODES.includes(planCode) ? { planCode } : {}),
    subscriptionStatus,
    entitlementStatus: statusFor(event.type, subscriptionStatus),
    periodStart: secondsToIso(firstItem.current_period_start || subscriptionRecord.current_period_start),
    periodEnd: secondsToIso(firstItem.current_period_end || subscriptionRecord.current_period_end),
    cancelAtPeriodEnd: Boolean(subscriptionRecord.cancel_at_period_end),
    canceledAt: secondsToIso(subscriptionRecord.canceled_at),
    metadata: resolved.context,
  };
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmac(payload: string, timestamp: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
}

export async function forwardJobAgentStripeEvent(
  env: Env,
  event: JobAgentBillingEvent
): Promise<void> {
  const origin = clean(env.JOBAGENT_API_ORIGIN, 500).replace(/\/+$/, '');
  const secret = clean(env.JOBAGENT_BILLING_SHARED_SECRET, 500);
  if (!origin.startsWith('https://') || !secret) {
    throw new Error('JobAgent billing delivery is not configured.');
  }
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await hmac(body, timestamp, secret);
  const delivered = await fetch(`${origin}/api/v1/internal/billing/events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-jobagent-timestamp': timestamp,
      'x-jobagent-signature': signature,
    },
    body,
  });
  if (!delivered.ok) {
    throw new Error(`JobAgent billing event delivery failed with ${delivered.status}.`);
  }
}
