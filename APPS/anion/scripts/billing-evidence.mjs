#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const baseUrl = (process.env.ANION_BASE_URL || 'https://anion.unalabs.cloud').replace(/\/+$/, '');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const bookingId = process.env.ANION_PHASE1_BOOKING_ID || '';
const parentEmail = process.env.ANION_PARENT_EMAIL || '';
const planId = process.env.ANION_BILLING_PLAN_ID || 'starter';
const priceEnvName = `STRIPE_PRICE_${planId.toUpperCase()}`;
const priceId = process.env[priceEnvName] || '';
const outputDir =
  process.env.ANION_EVIDENCE_DIR ||
  path.join(process.cwd(), 'test-results', `billing-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
    })
  : null;

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const results = [];
const screenshots = [];

function record(check, ok, detail = '') {
  results.push({ check, ok, detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${check}${detail ? `: ${detail}` : ''}`);
}

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
}

function safeName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function screenshot(page, name) {
  const file = path.join(outputDir, `${safeName(name)}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  screenshots.push(file);
  return file;
}

async function generateMagicLink(email) {
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      options: {
        redirect_to: `${baseUrl}/auth/callback`,
      },
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.action_link) {
    throw new Error(`Could not generate magic link for ${email}: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  return String(body.action_link);
}

async function signInParent(browser) {
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  const link = await generateMagicLink(parentEmail);
  await page.goto(link, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  const ok = new URL(page.url()).pathname === '/parent';
  await screenshot(page, 'parent-signed-in');
  record('parent sign-in routed to dashboard', ok, page.url());
  if (!ok) {
    throw new Error(`Parent sign-in did not land on /parent; current URL is ${page.url()}`);
  }
  return { context, page };
}

async function getParentRecord() {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users || data.users.length < 1000) break;
  }

  const authUser = users.find((user) => user.email?.toLowerCase() === parentEmail.toLowerCase());
  if (!authUser) {
    throw new Error(`Could not find Supabase auth user for ${parentEmail}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, auth_user_id, display_name')
    .eq('auth_user_id', authUser.id)
    .single();
  if (profileError || !profile) {
    throw new Error(`Could not find profile for ${parentEmail}: ${profileError?.message || 'missing row'}`);
  }

  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('id, profile_id')
    .eq('profile_id', profile.id)
    .single();
  if (parentError || !parent) {
    throw new Error(`Could not find parent row for ${parentEmail}: ${parentError?.message || 'missing row'}`);
  }

  record('parent Supabase record resolved', true, `profile=${profile.id}, parent=${parent.id}`);
  return { authUser, profile, parent };
}

async function createCheckoutSessionViaApp(page) {
  await page.goto('/parent', { waitUntil: 'networkidle' });
  const result = await page.evaluate(
    async ({ id, selectedPlanId, url }) => {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bookingId: id,
          planId: selectedPlanId,
          successUrl: `${url}/parent?billing=evidence-success`,
          cancelUrl: `${url}/pricing?billing=evidence-cancelled`,
        }),
      });
      const body = await response.json().catch(() => null);
      return { status: response.status, body };
    },
    { id: bookingId, selectedPlanId: planId, url: baseUrl },
  );

  const checkoutUrl = typeof result.body?.url === 'string' ? result.body.url : '';
  const ok = result.status === 200 && checkoutUrl.startsWith('https://checkout.stripe.com/');
  record('app checkout session created', ok, `HTTP ${result.status}, checkoutUrl=${checkoutUrl ? 'present' : 'missing'}`);

  if (ok) {
    await page.goto(checkoutUrl, { waitUntil: 'domcontentloaded' });
    await screenshot(page, 'stripe-checkout-opened');
    record('Stripe Checkout hosted page opens', page.url().startsWith('https://checkout.stripe.com/'), page.url());
  }
}

async function createSignedWebhookEvidence(parentRecord) {
  if (!stripe) throw new Error('Stripe client not initialized.');

  const paymentMethod = await stripe.paymentMethods.attach('pm_card_visa', {
    customer: (
      await stripe.customers.create({
        email: parentEmail,
        metadata: {
          profileId: parentRecord.profile.id,
          parentId: parentRecord.parent.id,
          evidence: 'anion-handover',
        },
      })
    ).id,
  });

  await stripe.customers.update(String(paymentMethod.customer), {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });

  const subscription = await stripe.subscriptions.create({
    customer: String(paymentMethod.customer),
    items: [{ price: priceId }],
    metadata: {
      planId,
      parentId: parentRecord.parent.id,
      profileId: parentRecord.profile.id,
      evidence: 'anion-handover',
    },
  });

  record('Stripe test subscription created', true, `subscription=${subscription.id}, status=${subscription.status}`);

  const event = {
    id: `evt_anion_evidence_${Date.now()}`,
    object: 'event',
    api_version: '2026-04-22.dahlia',
    created: Math.floor(Date.now() / 1000),
    data: { object: subscription },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: 'customer.subscription.updated',
  };
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  const response = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body: payload,
  });
  const body = await response.json().catch(() => null);
  record(
    'production webhook accepts signed Stripe event',
    response.status === 200 && body?.ok === true,
    `HTTP ${response.status}, type=${body?.type ?? '(none)'}`,
  );

  const { data: synced, error } = await supabase
    .from('subscriptions')
    .select('parent_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_id, status')
    .eq('parent_id', parentRecord.parent.id)
    .single();
  if (error || !synced) {
    record('subscription sync visible in Supabase', false, error?.message || 'missing subscription row');
    return;
  }
  record(
    'subscription sync visible in Supabase',
    synced.stripe_subscription_id === subscription.id && synced.plan_id === planId,
    `status=${synced.status}, plan=${synced.plan_id}`,
  );
}

async function verifyBillingPortal(page) {
  await page.goto('/parent', { waitUntil: 'networkidle' });
  const result = await page.evaluate(
    async ({ returnUrl }) => {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accountId: 'parent-self', returnUrl }),
      });
      const body = await response.json().catch(() => null);
      return { status: response.status, body };
    },
    { returnUrl: `${baseUrl}/parent?billing=portal-return` },
  );

  const portalUrl = typeof result.body?.url === 'string' ? result.body.url : '';
  record(
    'billing portal session created',
    result.status === 200 && portalUrl.startsWith('https://billing.stripe.com/'),
    `HTTP ${result.status}, portalUrl=${portalUrl ? 'present' : 'missing'}, code=${result.body?.code ?? '(none)'}`,
  );
}

function writeReports() {
  const report = {
    baseUrl,
    bookingId,
    parentEmail,
    planId,
    priceEnvName,
    generatedAt: new Date().toISOString(),
    screenshots: screenshots.map((file) => path.relative(process.cwd(), file)),
    results,
  };
  const jsonPath = path.join(outputDir, 'billing-evidence.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const lines = [
    '# Anion Billing Evidence',
    '',
    `- Base URL: ${baseUrl}`,
    `- Booking ID: ${bookingId}`,
    `- Parent email: ${parentEmail}`,
    `- Plan: ${planId}`,
    `- Generated: ${report.generatedAt}`,
    '',
    '## Results',
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...results.map((result) => `| ${result.check} | ${result.ok ? 'PASS' : 'FAIL'} | ${String(result.detail).replace(/\|/g, '/')} |`),
    '',
    '## Screenshots',
    '',
    ...screenshots.map((file) => `- ${path.relative(process.cwd(), file)}`),
    '',
  ];
  const mdPath = path.join(outputDir, 'billing-evidence.md');
  fs.writeFileSync(mdPath, lines.join('\n'));
  return { jsonPath, mdPath };
}

async function main() {
  requireEnv('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl);
  requireEnv('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
  requireEnv('STRIPE_SECRET_KEY', stripeSecretKey);
  requireEnv('STRIPE_WEBHOOK_SECRET', webhookSecret);
  requireEnv(priceEnvName, priceId);
  requireEnv('ANION_PHASE1_BOOKING_ID', bookingId);
  requireEnv('ANION_PARENT_EMAIL', parentEmail);

  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Billing evidence output: ${outputDir}`);

  const parentRecord = await getParentRecord();
  const browser = await chromium.launch({ headless: process.env.ANION_EVIDENCE_HEADED === '1' ? false : true });
  const { context, page } = await signInParent(browser);
  try {
    await createCheckoutSessionViaApp(page);
    await createSignedWebhookEvidence(parentRecord);
    await verifyBillingPortal(page);
  } finally {
    await context.close();
    await browser.close();
  }

  const { jsonPath, mdPath } = writeReports();
  console.log(`Billing evidence report: ${jsonPath}`);
  console.log(`Billing evidence summary: ${mdPath}`);

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error(`Billing evidence failed: ${failures.length}/${results.length} checks failed.`);
    process.exit(1);
  }

  console.log(`Billing evidence passed: ${results.length}/${results.length} checks passed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
