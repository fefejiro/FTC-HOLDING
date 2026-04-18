import Stripe from 'stripe';

export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_STARTER_MONTHLY: string;
  STRIPE_PRICE_STARTER_ANNUAL: string;
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: string;
  STRIPE_PRICE_PROFESSIONAL_ANNUAL: string;
  STRIPE_PRICE_AGENCY_MONTHLY: string;
  STRIPE_PRICE_AGENCY_ANNUAL: string;
  STRIPE_PRICE_ENTERPRISE_MONTHLY: string;
  UNALABS_SITE_URL: string;
  UNALABS_NEW_PROJECT_WEBHOOK_URL?: string;
  UNALABS_PROJECT_CONFIRMATION_EMAIL_WEBHOOK_URL?: string;
}

const ALLOWED_ORIGINS = [
  'https://unalabs.cloud',
  'http://localhost:3000',
  'http://localhost:3001',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function sanitize(value: unknown, maxLen = 500): string {
  return String(value ?? '').trim().slice(0, maxLen);
}

function getStripe(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function getSiteUrl(env: Env): string {
  return (env.UNALABS_SITE_URL || 'https://unalabs.cloud').replace(/\/+$/, '');
}

// Maps plan tier to the correct Stripe price ID
function getPriceId(env: Env, tier: string, billing: string): string | undefined {
  const map: Record<string, string | undefined> = {
    starter_monthly: env.STRIPE_PRICE_STARTER_MONTHLY,
    starter_annual: env.STRIPE_PRICE_STARTER_ANNUAL,
    professional_monthly: env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    professional_annual: env.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
    agency_monthly: env.STRIPE_PRICE_AGENCY_MONTHLY,
    agency_annual: env.STRIPE_PRICE_AGENCY_ANNUAL,
    enterprise_monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    enterprise_annual: env.STRIPE_PRICE_ENTERPRISE_MONTHLY, // same for enterprise
  };
  return map[`${tier}_${billing}`];
}

async function handleCreateCheckoutSession(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const email = sanitize(body.email);
  const tier = sanitize(body.tier).toLowerCase(); // starter | professional | agency | enterprise
  const billing = sanitize(body.billing).toLowerCase(); // monthly | annual
  const intakeId = sanitize(body.intake_id);

  if (!email || !email.includes('@')) {
    return json({ error: 'A valid email is required.' }, 400, origin);
  }
  if (!['starter', 'professional', 'agency', 'enterprise'].includes(tier)) {
    return json({ error: 'Invalid plan tier.' }, 400, origin);
  }
  if (!['monthly', 'annual'].includes(billing)) {
    return json({ error: 'Billing must be monthly or annual.' }, 400, origin);
  }

  const priceId = getPriceId(env, tier, billing);
  if (!priceId) {
    return json({ error: `Stripe price for ${tier}/${billing} is not configured.` }, 500, origin);
  }

  const siteUrl = getSiteUrl(env);

  let stripe: Stripe;
  try {
    stripe = getStripe(env);
  } catch {
    return json({ error: 'Payment service is not configured.' }, 500, origin);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { email, tier, billing, intake_id: intakeId },
      subscription_data: {
        trial_period_days: 14,
      },
    });
    return json({ url: session.url }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error.';
    return json({ error: message }, 500, origin);
  }
}

async function handleActivateProject(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const sessionId = sanitize(body.session_id);
  if (!sessionId) {
    return json({ error: 'session_id is required.' }, 400, origin);
  }

  let stripe: Stripe | null = null;
  let email = '';
  let tier = '';
  let billing = '';
  let intakeId = '';

  try {
    stripe = getStripe(env);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return json({ error: 'Payment not completed.' }, 402, origin);
    }
    email = session.customer_email ?? sanitize(session.metadata?.email);
    tier = session.metadata?.tier ?? '';
    billing = session.metadata?.billing ?? '';
    intakeId = session.metadata?.intake_id ?? '';
  } catch {
    return json({ error: 'Could not verify payment.' }, 500, origin);
  }

  const activation = {
    intake_id: intakeId,
    email,
    tier,
    billing,
    payment_status: 'active',
    session_id: sessionId,
    created_at: new Date().toISOString(),
  };

  // Notify admin
  if (env.UNALABS_NEW_PROJECT_WEBHOOK_URL) {
    try {
      await fetch(env.UNALABS_NEW_PROJECT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-unalabs-source': 'stripe-api-worker' },
        body: JSON.stringify({ type: 'una_new_subscription', activation }),
      });
    } catch { /* non-fatal */ }
  }

  // Send confirmation email
  const emailWebhook = env.UNALABS_PROJECT_CONFIRMATION_EMAIL_WEBHOOK_URL;
  if (emailWebhook && email) {
    try {
      await fetch(emailWebhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-unalabs-source': 'stripe-api-worker' },
        body: JSON.stringify({ type: 'una_subscription_confirmation', email, tier, billing, session_id: sessionId }),
      });
    } catch { /* non-fatal */ }
  }

  return json({ ok: true, activation }, 200, origin);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin');

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, origin);
    }

    switch (url.pathname) {
      case '/api/create-checkout-session':
        return handleCreateCheckoutSession(req, env, origin);
      case '/api/activate-project':
        return handleActivateProject(req, env, origin);
      default:
        return json({ error: 'Not found.' }, 404, origin);
    }
  },
};
