import Stripe from 'stripe';
import {
  forwardJobAgentStripeEvent,
  handleJobAgentRoute,
  normalizeJobAgentStripeEvent,
} from './jobagent';

export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_STARTER_MONTHLY: string;
  STRIPE_PRICE_STARTER_ANNUAL: string;
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: string;
  STRIPE_PRICE_PROFESSIONAL_ANNUAL: string;
  STRIPE_PRICE_AGENCY_MONTHLY: string;
  STRIPE_PRICE_AGENCY_ANNUAL: string;
  STRIPE_PRICE_ENTERPRISE_MONTHLY: string;
  STRIPE_PRICE_ENTERPRISE_ANNUAL: string;
  UNALABS_SITE_URL: string;
  UNALABS_NEW_PROJECT_WEBHOOK_URL?: string;
  UNALABS_PROJECT_CONFIRMATION_EMAIL_WEBHOOK_URL?: string;
  MAILJET_API_KEY?: string;
  MAILJET_SECRET_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  OPENAI_API_KEY?: string;
  ATEAM_KEY?: string;
  UNALABS_PROJECT_PIPELINE_MODE?: string;
  AUTOCOLLECT_REMINDER_INTERVAL_DAYS?: string;
  AUTOCOLLECT_MAX_ATTEMPTS?: string;
  AUTOCOLLECT_DAILY_EMAIL_CAP?: string;
  AUTOCOLLECT_MAX_SEND_PER_RUN?: string;
  GITHUB_TOKEN?: string;
  JOBAGENT_API_ORIGIN?: string;
  JOBAGENT_APP_ORIGIN?: string;
  JOBAGENT_BILLING_SHARED_SECRET?: string;
  JOBAGENT_SPRINT_WEEKLY_LOOKUP_KEY?: string;
  JOBAGENT_MONTHLY_LOOKUP_KEY?: string;
  JOBAGENT_ANNUAL_LOOKUP_KEY?: string;
  JOBAGENT_SPRINT_WEEKLY_CAD_CENTS?: string;
  JOBAGENT_MONTHLY_CAD_CENTS?: string;
  JOBAGENT_ANNUAL_CAD_CENTS?: string;
  JOBAGENT_FOUNDING_PROMOTION_CODE?: string;
  JOBAGENT_EMAIL_FROM?: string;
  SPARK_ENABLED?: string;
  SPARK_PREVIEW_TURNS?: string;
  SPARK_MAX_TURNS?: string;
  SPARK_MAX_TOKENS_PER_TURN?: string;
  SPARK_RATE_LIMIT_WINDOW_MS?: string;
  SPARK_RATE_LIMIT_MAX?: string;
  SPARK_PASS_PRICE_CAD?: string;
  STRIPE_PRICE_SPARK_PASS?: string;
}

// ── Spark in-memory rate limit store (per worker instance) ─────────────
const sparkIpRateLimitStore = new Map<string, number[]>();

function shouldDeliverBridgeWebhook(env: Env): boolean {
  const mode = (env.UNALABS_PROJECT_PIPELINE_MODE ?? 'worker_only').trim().toLowerCase();
  return mode === 'hybrid' && Boolean(env.UNALABS_NEW_PROJECT_WEBHOOK_URL);
}

const ALLOWED_ORIGINS = [
  'https://unalabs.cloud',
  'https://jobagent.unalabs.cloud',
  'http://localhost:3000',
  'http://localhost:3001',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}

function sanitize(value: unknown, maxLen = 500): string {
  return String(value ?? '').trim().slice(0, maxLen);
}

function sanitizeIntake(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const allowedKeys = [
    'intakeId',
    'name',
    'email',
    'company',
    'role',
    'teamSize',
    'plan',
    'billing',
    'projectTitle',
    'projectSummary',
    'activationBand',
    'activationFee',
    'checkoutType',
    'serviceType',
    'founderOverride',
    'creditTowardBuild',
  ];
  const intake = value as Record<string, unknown>;
  const entries = allowedKeys
    .map((key) => [key, sanitize(intake[key], 200)] as const)
    .filter(([, sanitizedValue]) => Boolean(sanitizedValue));

  return Object.fromEntries(entries);
}

type ActivationPayload = {
  intake_id: string;
  email: string;
  tier: string;
  billing: string;
  checkout_type: 'subscription' | 'activation';
  service_type: string;
  amount_cad: number;
  founder_override: boolean;
  credit_toward_build: boolean;
  payment_status: 'active';
  session_id: string;
  created_at: string;
  intake: Record<string, string>;
};

type ProjectWriteResult = {
  attempted: boolean;
  inserted: boolean;
  duplicate: boolean;
  projectId?: string;
  status: number;
  error?: string;
};

type DeliveryResult = {
  attempted: boolean;
  delivered: boolean;
  status: number;
  error?: string;
};

type ActivationRunResult = {
  activation: ActivationPayload;
  alreadyActivated: boolean;
  projectWrite: ProjectWriteResult;
  projectWebhook: DeliveryResult;
  emailWebhook: DeliveryResult;
};

type AuthenticatedUser = {
  email: string;
};

type PriceInsight = {
  suggested_min_cad: number;
  suggested_max_cad: number;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
};

type ScopeDraftMilestone = {
  title: string;
  description: string;
  due_offset_days: number;
};

type ScopeDraft = {
  summary: string;
  problem_statement: string;
  solution_direction: string;
  activation_band: string;
  milestones: ScopeDraftMilestone[];
  pricing: PriceInsight | null;
};

type Branding = {
  companyName?: string;
  primaryColor?: string;
  logoUrl?: string;
  tagline?: string;
  replyEmail?: string;
};

type ContractProject = {
  id: string;
  email: string;
  name?: string;
  tier?: string;
  billing?: string;
  status?: string;
  created_at?: string;
};

type ContractMilestone = {
  id: string;
  title?: string;
  due_date?: string;
  status?: string;
};

type ContractRecord = {
  id: string;
  project_id: string;
  title?: string;
  body: string;
  status?: string;
  sent_at?: string;
  signer_name?: string;
  signer_email?: string;
  signature_text?: string;
  signed_at?: string;
  signed_ip?: string;
  signed_user_agent?: string;
  created_at?: string;
  updated_at?: string;
};

type InvoiceMilestone = {
  id: string;
  project_id: string;
  title?: string;
};

type InvoiceRecord = {
  id: string;
  project_id: string;
  milestone_id: string;
  invoice_number: string;
  title: string;
  amount_cad: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  client_email: string;
  created_at: string;
};

type InstantBillRecord = {
  id: string;
  project_id: string;
  stripe_payment_link_id: string;
  stripe_price_id: string;
  amount_cad: number;
  description: string;
  payment_link_url: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type AutoCollectRecord = {
  id: string;
  invoice_id: string;
  project_id: string;
  client_email: string;
  invoice_number: string;
  amount_cad: number;
  due_date: string;
  status: string;
  attempts: number;
  last_invited_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type AutoCollectSyncResult = {
  synced: number;
  reconciled_paid: number;
  overdue_only: boolean;
  items: AutoCollectRecord[];
  message?: string;
};

type AutoCollectInviteResult = {
  ok: boolean;
  item?: AutoCollectRecord;
  skipped?: string;
  error?: string;
};

type AutoCollectHealth = {
  generated_at: string;
  queue_total: number;
  queue_pending: number;
  queue_invite_sent: number;
  queue_paid: number;
  escalations: number;
  sent_today: number;
  daily_cap: number;
  remaining_daily_budget: number;
  max_send_per_run: number;
  reminder_interval_days: number;
  max_attempts: number;
  latest_invited_at: string | null;
};

type StatusRag = 'green' | 'yellow' | 'red';

type PublicStatusModule = {
  id: number;
  name: string;
  status: StatusRag;
  detail: string;
};

type PublicStatusTestingLane = {
  name: string;
  status: StatusRag;
  detail: string;
};

type PublicStatusSummary = {
  generated_at: string;
  report_url: string;
  docs: {
    status_doc: string;
    master_doc: string;
  };
  score: {
    done: number;
    in_progress: number;
    not_started: number;
    total: number;
  };
  modules: PublicStatusModule[];
  testing: PublicStatusTestingLane[];
  connections: Array<{ name: string; status: StatusRag; url: string; detail: string }>;
  autocollect: AutoCollectHealth | null;
};

type MailDeliveryResult = {
  ok: boolean;
  status: number;
  error?: string;
};

function logEvent(event: string, details: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...details }));
}

async function sendIntakeNotification(env: Env, activation: {
  email: string; tier: string; billing: string; intake_id: string; session_id: string; created_at: string;
}, intake: Record<string, string>): Promise<void> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) return;

  const planLabel: Record<string, string> = { starter: 'Starter ($67/mo)', professional: 'Professional ($135/mo)', agency: 'Agency ($339/mo)', enterprise: 'Enterprise ($679/mo)' };
  const billingLabel = activation.billing === 'annual' ? 'Annual' : 'Monthly';
  const intakeLines = Object.entries(intake).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">${k}</td><td style="padding:4px 0;font-size:13px;color:#0B0E11">${v}</td></tr>`).join('');

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">New Una Labs Customer</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0">${activation.created_at}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Email</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#0B0E11">${activation.email}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Plan</td><td style="padding:4px 0;font-size:13px;color:#0B0E11">${planLabel[activation.tier] ?? activation.tier} — ${billingLabel}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Session</td><td style="padding:4px 0;font-size:13px;color:#0B0E11">${activation.session_id}</td></tr>
    ${intakeLines}
  </table>
  <p style="font-size:12px;color:#9CA3AF">Una Labs intake system · unalabs.cloud</p>
</div>`;

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
  await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
    body: JSON.stringify({
      Messages: [{
        From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
        To: [{ Email: 'mike.fejiro@gmail.com', Name: 'Mike' }],
        Subject: `New customer: ${activation.email} — ${activation.tier} (${billingLabel})`,
        HTMLPart: html,
        TextPart: `New Una Labs customer\n\nEmail: ${activation.email}\nPlan: ${activation.tier} (${billingLabel})\nSession: ${activation.session_id}\n\nIntake:\n${Object.entries(intake).map(([k, v]) => `${k}: ${v}`).join('\n')}`,
      }],
    }),
  });
}

async function sendCustomerWelcome(env: Env, activation: {
  email: string; tier: string; billing: string; session_id: string; created_at: string; checkout_type?: string; amount_cad?: number; credit_toward_build?: boolean;
}, name?: string): Promise<void> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) return;

  if (normalizeCheckoutType(activation.checkout_type) === 'activation') {
    const firstName = name || activation.email.split('@')[0];
    const dashboardUrl = 'https://unalabs.cloud/login?redirect=/dashboard';
    const offerLabel = getTierLabel(activation.tier);
    const chargedToday = typeof activation.amount_cad === 'number'
      ? activation.amount_cad
      : ACTIVATION_TIER_PRICES[activation.tier as keyof typeof ACTIVATION_TIER_PRICES] ?? 0;
    const creditLine = activation.credit_toward_build
      ? 'This activation fee will be credited toward your first build payment.'
      : 'Build deposit is handled separately after scope approval.';
    const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff">
  <div style="background:#4DB8A8;border-radius:10px;padding:20px 24px;margin-bottom:28px">
    <p style="color:white;font-weight:700;font-size:18px;margin:0">Project activation confirmed.</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0">Una Labs | unalabs.cloud</p>
  </div>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:20px">Hey ${firstName},</p>
  <p style="font-size:15px;color:#374151;margin-bottom:24px;line-height:1.6">
    Your <strong>${offerLabel}</strong> payment has gone through. We are opening your workspace and preparing the scope pack now.
  </p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;background:#F9FAFB;border-radius:8px;overflow:hidden">
    <tr><td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB">Service</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0B0E11;border-bottom:1px solid #E5E7EB">${offerLabel}</td></tr>
    <tr><td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB">Charged today</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0B0E11;border-bottom:1px solid #E5E7EB">CA$${chargedToday}</td></tr>
    <tr><td style="padding:10px 16px;color:#6B7280;font-size:13px">Next payment</td><td style="padding:10px 16px;font-size:13px;color:#0B0E11">Build deposit after scope approval</td></tr>
  </table>
  <p style="font-size:14px;color:#374151;margin-bottom:8px;font-weight:600">What happens next</p>
  <ol style="padding-left:20px;margin:0 0 24px;color:#374151;font-size:14px;line-height:1.8">
    <li>We turn your intake into a structured workspace and scoped plan.</li>
    <li>You review the scope pack, roadmap, and recommendation.</li>
    <li>${creditLine}</li>
  </ol>
  <a href="${dashboardUrl}" style="display:inline-block;background:#F97316;color:white;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">
    Open your dashboard ->
  </a>
  <p style="font-size:13px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px;margin-top:16px">
    Questions? Reply to this email or reach us at <a href="mailto:hello@unalabs.cloud" style="color:#4DB8A8">hello@unalabs.cloud</a><br>
    Una Labs | unalabs.cloud
  </p>
</div>`;
    const text = `Hey ${firstName},\n\nYour ${offerLabel} payment has gone through. We are opening your workspace and preparing the scope pack now.\n\nService: ${offerLabel}\nCharged today: CA$${chargedToday}\nNext payment: Build deposit after scope approval\n\n${creditLine}\n\nOpen your dashboard: ${dashboardUrl}\n\nQuestions? Reply here or email hello@unalabs.cloud\n\nUna Labs | unalabs.cloud`;
    const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({
        Messages: [{
          From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
          To: [{ Email: activation.email, Name: firstName }],
          Subject: `Your ${offerLabel} is confirmed - Una Labs`,
          HTMLPart: html,
          TextPart: text,
        }],
      }),
    });
    return;
  }

  const planLabel: Record<string, string> = { starter: 'Starter', professional: 'Professional', agency: 'Agency', enterprise: 'Enterprise' };
  const priceLabel: Record<string, string> = { starter: 'CA$67/mo', professional: 'CA$135/mo', agency: 'CA$339/mo', enterprise: 'CA$679/mo' };
  const billingLabel = activation.billing === 'annual' ? 'Annual billing' : 'Monthly billing';
  const plan = planLabel[activation.tier] ?? activation.tier;
  const price = priceLabel[activation.tier] ?? '';
  const firstName = name || activation.email.split('@')[0];
  const dashboardUrl = 'https://unalabs.cloud/login?redirect=/dashboard';

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff">
  <div style="background:#4DB8A8;border-radius:10px;padding:20px 24px;margin-bottom:28px">
    <p style="color:white;font-weight:700;font-size:18px;margin:0">You're in — trial started.</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0">Una Labs · unalabs.cloud</p>
  </div>

  <p style="font-size:15px;color:#0B0E11;margin-bottom:20px">Hey ${firstName},</p>
  <p style="font-size:15px;color:#374151;margin-bottom:24px;line-height:1.6">
    Your <strong>${plan}</strong> 14-day free trial is now active. Nothing is charged until day 15.
  </p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;background:#F9FAFB;border-radius:8px;overflow:hidden">
    <tr><td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB">Plan</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0B0E11;border-bottom:1px solid #E5E7EB">${plan} — ${price}</td></tr>
    <tr><td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB">Billing</td><td style="padding:10px 16px;font-size:13px;color:#0B0E11;border-bottom:1px solid #E5E7EB">${billingLabel}</td></tr>
    <tr><td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB">Trial period</td><td style="padding:10px 16px;font-size:13px;color:#4DB8A8;font-weight:600;border-bottom:1px solid #E5E7EB">14 days free</td></tr>
    <tr><td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB">Charged today</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0B0E11;border-bottom:1px solid #E5E7EB">CA$0</td></tr>
    <tr><td style="padding:10px 16px;color:#6B7280;font-size:13px">First charge</td><td style="padding:10px 16px;font-size:13px;color:#0B0E11">Day 15 of your trial</td></tr>
  </table>

  <p style="font-size:14px;color:#374151;margin-bottom:8px;font-weight:600">What happens next</p>
  <ol style="padding-left:20px;margin:0 0 24px;color:#374151;font-size:14px;line-height:1.8">
    <li>You'll hear from us within 1 business day to kick things off.</li>
    <li>Log into your dashboard to track project progress and milestones.</li>
    <li>Cancel any time before day 15 — no charge, no friction.</li>
  </ol>

  <a href="${dashboardUrl}" style="display:inline-block;background:#F97316;color:white;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">
    Open your dashboard →
  </a>

  <p style="font-size:13px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px;margin-top:16px">
    Questions? Reply to this email or reach us at <a href="mailto:hello@unalabs.cloud" style="color:#4DB8A8">hello@unalabs.cloud</a><br>
    Una Labs · unalabs.cloud
  </p>
</div>`;

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
  await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
    body: JSON.stringify({
      Messages: [{
        From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
        To: [{ Email: activation.email, Name: firstName }],
        Subject: `Your ${plan} trial is active — Una Labs`,
        HTMLPart: html,
        TextPart: `Hey ${firstName},\n\nYour ${plan} 14-day free trial is now active. Nothing is charged until day 15.\n\nPlan: ${plan} — ${price}\nBilling: ${billingLabel}\nCharged today: CA$0\nFirst charge: Day 15\n\nOpen your dashboard: ${dashboardUrl}\n\nQuestions? Reply here or email hello@unalabs.cloud\n\nUna Labs · unalabs.cloud`,
      }],
    }),
  });
}

function cleanSecret(val: string): string {
  // Strip BOM (U+FEFF) and whitespace that PowerShell stdin may prepend
  return val.replace(/^\uFEFF/, '').trim();
}

const SUBSCRIPTION_TIERS = ['starter', 'professional', 'agency', 'enterprise'] as const;
const ACTIVATION_TIERS = [
  'founding_pilot_activation',
  'simple_activation',
  'standard_activation',
  'complex_activation',
] as const;

const ACTIVATION_TIER_PRICES: Record<(typeof ACTIVATION_TIERS)[number], number> = {
  founding_pilot_activation: 67,
  simple_activation: 250,
  standard_activation: 500,
  complex_activation: 1000,
};

const ACTIVATION_TIER_LABELS: Record<(typeof ACTIVATION_TIERS)[number], string> = {
  founding_pilot_activation: 'Founding Pilot Activation',
  simple_activation: 'Simple Project Activation',
  standard_activation: 'Standard Custom Scoping',
  complex_activation: 'Complex Discovery and Architecture',
};

function isSubscriptionTier(value: string): value is (typeof SUBSCRIPTION_TIERS)[number] {
  return (SUBSCRIPTION_TIERS as readonly string[]).includes(value);
}

function isActivationTier(value: string): value is (typeof ACTIVATION_TIERS)[number] {
  return (ACTIVATION_TIERS as readonly string[]).includes(value);
}

function normalizeCheckoutType(value: unknown): 'subscription' | 'activation' {
  return value === 'activation' ? 'activation' : 'subscription';
}

function getTierLabel(tier: string): string {
  const subscriptionLabels: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    agency: 'Agency',
    enterprise: 'Enterprise',
  };

  if (isActivationTier(tier)) {
    return ACTIVATION_TIER_LABELS[tier];
  }

  return subscriptionLabels[tier] ?? tier;
}

const ADMIN_EMAIL = 'mike.fejiro@gmail.com';

const INVOICE_TIER_PRICE: Record<string, number> = {
  starter: 67,
  professional: 135,
  agency: 339,
  enterprise: 679,
};

const AI_PRICE_BOUNDS: Record<string, { min: number; max: number }> = {
  starter: { min: 300, max: 1200 },
  professional: { min: 1200, max: 5000 },
  agency: { min: 5000, max: 12000 },
  enterprise: { min: 12000, max: 30000 },
};

function normalizePriceInsight(raw: unknown, tierRaw: string): PriceInsight | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as {
    suggested_min_cad?: unknown;
    suggested_max_cad?: unknown;
    rationale?: unknown;
    confidence?: unknown;
  };

  const tier = tierRaw.toLowerCase();
  const bounds = AI_PRICE_BOUNDS[tier] ?? AI_PRICE_BOUNDS.professional;
  const parsedMin = Number(parsed.suggested_min_cad);
  const parsedMax = Number(parsed.suggested_max_cad);

  if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) return null;

  let min = Math.round(parsedMin);
  let max = Math.round(parsedMax);

  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }

  min = Math.max(bounds.min, min);
  max = Math.min(bounds.max, max);

  if (min > max) {
    min = bounds.min;
    max = bounds.max;
  }

  const rationale = sanitize(String(parsed.rationale ?? ''), 400);
  if (!rationale) return null;

  const confidenceRaw = String(parsed.confidence ?? '').toLowerCase();
  const confidence: PriceInsight['confidence'] =
    confidenceRaw === 'low' || confidenceRaw === 'high' ? confidenceRaw : 'medium';

  return {
    suggested_min_cad: min,
    suggested_max_cad: max,
    rationale,
    confidence,
  };
}

function normalizeActivationBand(value: string): string {
  const normalized = sanitize(value, 80).toLowerCase();
  if (isActivationTier(normalized)) return normalized;
  if (isSubscriptionTier(normalized)) return normalized;
  return 'standard_activation';
}

function getScopeDraftFallback(intake: Record<string, string>, activation: Pick<ActivationPayload, 'email' | 'tier' | 'billing' | 'intake_id'>): ScopeDraft {
  const activationBand = normalizeActivationBand(
    intake.activationBand || intake.plan || activation.tier || 'standard_activation',
  );
  const projectTitle = sanitize(intake.projectTitle || intake.company || intake.name || 'Custom project', 140);
  const summarySeed = sanitize(intake.projectSummary || '', 400);
  const summary = summarySeed
    || `${projectTitle} is entering concierge onboarding so Una Labs can turn the intake into a structured scope, roadmap, and build recommendation.`;
  const companyOrClient = sanitize(intake.company || intake.name || activation.email.split('@')[0], 120);
  const problemStatement = `The current brief for ${companyOrClient} still needs structured scoping, pricing guidance, and a clear approval path before build starts.`;
  const solutionDirection = `Prepare a service-led scope pack for ${projectTitle}, align milestones to the agreed activation band, and move the project to approval before requesting the build deposit.`;
  const bounds = AI_PRICE_BOUNDS[activationBand] ?? AI_PRICE_BOUNDS.professional;

  return {
    summary,
    problem_statement: problemStatement,
    solution_direction: solutionDirection,
    activation_band: activationBand,
    milestones: [
      {
        title: 'Intake synthesis and project brief',
        description: 'Turn the intake call, notes, and constraints into a clear brief with goals, scope edges, and a recommended direction.',
        due_offset_days: 7,
      },
      {
        title: 'Roadmap and commercial recommendation',
        description: 'Define the implementation phases, timeline assumptions, and the first build recommendation for approval.',
        due_offset_days: 21,
      },
      {
        title: 'Approval package and build readiness',
        description: 'Finalize the scope pack, engagement letter, and deposit readiness so build can move to active once approved.',
        due_offset_days: 45,
      },
    ],
    pricing: {
      suggested_min_cad: bounds.min,
      suggested_max_cad: bounds.max,
      rationale: 'Initial range inferred from the activation band and available intake context. Final pricing is confirmed after review and approval.',
      confidence: 'medium',
    },
  };
}

async function generateScopeDraftFromIntake(
  intake: Record<string, string>,
  activation: Pick<ActivationPayload, 'email' | 'tier' | 'billing' | 'intake_id'>,
  env: Env,
): Promise<ScopeDraft> {
  const fallback = getScopeDraftFallback(intake, activation);
  if (!env.OPENAI_API_KEY) {
    logEvent('scope_draft_openai_missing', {
      email: activation.email,
      activation_band: fallback.activation_band,
    });
    return fallback;
  }

  try {
    const intakeId = activation.intake_id || intake.intakeId || '';
    const isRealtorLead = intakeId.includes('realtor_') || intake.type === 'realtor_lead';
    const systemPrompt = isRealtorLead
      ? `You are a real estate lead qualification system designer for Una Labs. Return ONLY valid JSON with this exact shape: {"summary":"...","problem_statement":"...","solution_direction":"...","activation_band":"simple_activation|standard_activation|complex_activation|founding_pilot_activation","milestones":[{"title":"...","description":"...","due_offset_days":7},{"title":"...","description":"...","due_offset_days":21},{"title":"...","description":"...","due_offset_days":45}],"pricing":{"suggested_min_cad":number,"suggested_max_cad":number,"rationale":"1-2 concise sentences","confidence":"low|medium|high"}}. Focus on AI voice qualification, lead scoring, CRM handoff, and follow-up automation. No markdown fences. No prose.`
      : `You are a project scoping assistant for Una Labs, a Canadian digital agency. Return ONLY valid JSON with this exact shape: {"summary":"...","problem_statement":"...","solution_direction":"...","activation_band":"simple_activation|standard_activation|complex_activation|founding_pilot_activation","milestones":[{"title":"...","description":"...","due_offset_days":7},{"title":"...","description":"...","due_offset_days":21},{"title":"...","description":"...","due_offset_days":45}],"pricing":{"suggested_min_cad":number,"suggested_max_cad":number,"rationale":"1-2 concise sentences","confidence":"low|medium|high"}}. Keep it practical, concise, and grounded in service-led onboarding. No markdown fences. No prose.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanSecret(env.OPENAI_API_KEY)}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              name: intake.name || '',
              email: intake.email || activation.email,
              company: intake.company || '',
              role: intake.role || '',
              teamSize: intake.teamSize || '',
              projectTitle: intake.projectTitle || '',
              projectSummary: intake.projectSummary || '',
              transcript: intake.transcript || '',
              plan: intake.plan || activation.tier,
              activationBand: intake.activationBand || activation.tier,
              billing: intake.billing || activation.billing,
            }),
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      logEvent('scope_draft_openai_error', {
        email: activation.email,
        status: openaiResponse.status,
      });
      return fallback;
    }

    const openaiData = (await openaiResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = openaiData.choices?.[0]?.message?.content ?? '';
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const parsed = JSON.parse(jsonStr) as Partial<ScopeDraft> & { pricing?: unknown };
    const activationBand = normalizeActivationBand(
      String(parsed.activation_band || fallback.activation_band || activation.tier),
    );
    const pricing = normalizePriceInsight(parsed.pricing, activationBand) ?? fallback.pricing;
    const milestones = Array.isArray(parsed.milestones) && parsed.milestones.length > 0
      ? parsed.milestones.slice(0, 3).map((milestone, index) => ({
          title: sanitize(milestone?.title || fallback.milestones[index]?.title || `Milestone ${index + 1}`, 120),
          description: sanitize(
            milestone?.description || fallback.milestones[index]?.description || 'Milestone details will be finalized during review.',
            280,
          ),
          due_offset_days: [7, 21, 45][index],
        }))
      : fallback.milestones;

    return {
      summary: sanitize(parsed.summary || fallback.summary, 600),
      problem_statement: sanitize(parsed.problem_statement || fallback.problem_statement, 600),
      solution_direction: sanitize(parsed.solution_direction || fallback.solution_direction, 600),
      activation_band: activationBand,
      milestones,
      pricing,
    };
  } catch (error) {
    logEvent('scope_draft_openai_exception', {
      email: activation.email,
      error: error instanceof Error ? error.message : 'Unknown scope draft error.',
    });
    return fallback;
  }
}

async function writeScopeDraftToSupabase(
  projectId: string,
  draft: ScopeDraft,
  env: Env,
  options?: { status?: string },
): Promise<void> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const today = new Date();
  const milestonesToWrite = draft.milestones.map((milestone, index) => {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + ([7, 21, 45][index] ?? milestone.due_offset_days ?? 0));
    return {
      project_id: projectId,
      title: sanitize(milestone.title, 120),
      description: sanitize(milestone.description, 280),
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
    };
  });

  const deleteMilestonesResponse = await fetch(`${supabaseUrl}/rest/v1/milestones?project_id=eq.${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });

  if (!deleteMilestonesResponse.ok) {
    const error = await deleteMilestonesResponse.text();
    throw new Error(`Failed to reset milestones: ${error}`);
  }

  const milestonesResponse = await fetch(`${supabaseUrl}/rest/v1/milestones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(milestonesToWrite),
  });

  if (!milestonesResponse.ok) {
    const error = await milestonesResponse.text();
    throw new Error(`Failed to write milestones: ${error}`);
  }

  const status = sanitize(options?.status || 'scoped', 80) || 'scoped';
  const updateResponse = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      status,
      tier: draft.activation_band,
      ai_price_min_cad: draft.pricing?.suggested_min_cad ?? null,
      ai_price_max_cad: draft.pricing?.suggested_max_cad ?? null,
      ai_price_rationale: draft.pricing?.rationale ?? null,
      ai_price_confidence: draft.pricing?.confidence ?? null,
      ai_price_generated_at: new Date().toISOString(),
    }),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to update project scope fields: ${error}`);
  }
}

function getSupabaseApiKey(env: Env): string {
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY;
  if (!env.SUPABASE_URL || !key) throw new Error('Supabase not configured.');
  return cleanSecret(key);
}

function getSupabaseServiceKey(env: Env): string {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase service role not configured.');
  return cleanSecret(env.SUPABASE_SERVICE_ROLE_KEY);
}

function getAutoCollectReminderIntervalDays(env: Env): number {
  const parsed = Number(env.AUTOCOLLECT_REMINDER_INTERVAL_DAYS ?? '3');
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(Math.max(Math.floor(parsed), 1), 30);
}

function getAutoCollectMaxAttempts(env: Env): number {
  const parsed = Number(env.AUTOCOLLECT_MAX_ATTEMPTS ?? '3');
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(Math.max(Math.floor(parsed), 1), 10);
}

function getAutoCollectDailyEmailCap(env: Env): number {
  const parsed = Number(env.AUTOCOLLECT_DAILY_EMAIL_CAP ?? '80');
  if (!Number.isFinite(parsed)) return 80;
  return Math.min(Math.max(Math.floor(parsed), 1), 1000);
}

function getAutoCollectMaxSendPerRun(env: Env): number {
  const parsed = Number(env.AUTOCOLLECT_MAX_SEND_PER_RUN ?? '25');
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(Math.max(Math.floor(parsed), 1), 200);
}

function getUtcDayStartIso(now = new Date()): string {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return dayStart.toISOString();
}

async function getAutoCollectSentTodayCount(env: Env, now = new Date()): Promise<number> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const dayStartIso = getUtcDayStartIso(now);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/autocollect_items?select=id&status=eq.invite_sent&last_invited_at=gte.${encodeURIComponent(dayStartIso)}&limit=1000`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to load AutoCollect send counts: ${error}`);
  }

  const rows = await res.json() as Array<{ id: string }>;
  return rows.length;
}

function shouldSendAutoCollectReminder(item: AutoCollectRecord, env: Env, now = new Date()): { eligible: boolean; reason?: string } {
  const maxAttempts = getAutoCollectMaxAttempts(env);
  if ((item.attempts ?? 0) >= maxAttempts) {
    return { eligible: false, reason: `max_attempts_reached:${maxAttempts}` };
  }

  if (!item.last_invited_at) {
    return { eligible: true };
  }

  const lastInvitedAt = new Date(item.last_invited_at);
  if (Number.isNaN(lastInvitedAt.getTime())) {
    return { eligible: true };
  }

  const reminderIntervalDays = getAutoCollectReminderIntervalDays(env);
  const elapsedMs = now.getTime() - lastInvitedAt.getTime();
  const requiredMs = reminderIntervalDays * 24 * 60 * 60 * 1000;
  if (elapsedMs < requiredMs) {
    return { eligible: false, reason: `cooldown_active:${reminderIntervalDays}d` };
  }

  return { eligible: true };
}

async function syncAutoCollectItems(env: Env, options?: { overdueOnly?: boolean; limit?: number }): Promise<AutoCollectSyncResult> {
  const overdueOnly = options?.overdueOnly !== false;
  const limitRaw = Number(options?.limit ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 100;
  const reconciledPaid = await reconcilePaidAutoCollectItems(env);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const today = new Date().toISOString().slice(0, 10);

  const filters = [
    'status=eq.unpaid',
    'select=id,project_id,invoice_number,amount_cad,due_date,client_email',
    'order=due_date.asc',
    `limit=${limit}`,
  ];
  if (overdueOnly) filters.push(`due_date=lte.${today}`);

  const invoiceRes = await fetch(`${supabaseUrl}/rest/v1/invoices?${filters.join('&')}`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });

  if (!invoiceRes.ok) {
    const error = await invoiceRes.text();
    throw new Error(`Failed to load unpaid invoices: ${error}`);
  }

  const invoices = await invoiceRes.json() as Array<{
    id: string;
    project_id: string;
    invoice_number: string;
    amount_cad: number;
    due_date: string;
    client_email: string;
  }>;

  if (!invoices.length) {
    return {
      ok: true,
      synced: 0,
      reconciled_paid: reconciledPaid,
      overdue_only: overdueOnly,
      items: [],
      message: 'No invoices to sync.',
    } as AutoCollectSyncResult & { ok: true };
  }

  const payload = invoices.map((invoice) => ({
    invoice_id: invoice.id,
    project_id: invoice.project_id,
    client_email: invoice.client_email,
    invoice_number: invoice.invoice_number,
    amount_cad: invoice.amount_cad,
    due_date: invoice.due_date,
    updated_at: new Date().toISOString(),
  }));

  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/autocollect_items?on_conflict=invoice_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!upsertRes.ok) {
    const error = await upsertRes.text();
    throw new Error(`Failed to sync AutoCollect items: ${error}`);
  }

  const syncedItems = await upsertRes.json() as AutoCollectRecord[];
  return { synced: syncedItems.length, reconciled_paid: reconciledPaid, overdue_only: overdueOnly, items: syncedItems };
}

async function markAutoCollectItemsPaidByIds(env: Env, itemIds: string[], note = 'reconciled_paid_invoice'): Promise<number> {
  if (!itemIds.length) return 0;

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const idClause = itemIds.map((id) => encodeURIComponent(id)).join(',');

  const updateRes = await fetch(`${supabaseUrl}/rest/v1/autocollect_items?id=in.(${idClause})&select=id`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      status: 'paid',
      notes: note,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!updateRes.ok) {
    const error = await updateRes.text();
    throw new Error(`Failed to mark AutoCollect items paid: ${error}`);
  }

  const rows = await updateRes.json() as Array<{ id: string }>;
  return rows.length;
}

async function sendMailjetMessages(env: Env, payload: unknown): Promise<MailDeliveryResult> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) {
    return { ok: false, status: 0, error: 'Mail provider not configured.' };
  }

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) return { ok: true, status: response.status };

    const errorText = await response.text();
    const hint = response.status === 429 || /limit|quota|rate/i.test(errorText)
      ? 'mail_limit_reached'
      : 'mail_delivery_failed';
    return { ok: false, status: response.status, error: `${hint}: ${errorText || 'mail provider rejected request'}` };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? `mail_transport_error: ${error.message}` : 'mail_transport_error',
    };
  }
}

async function getAutoCollectHealth(env: Env): Promise<AutoCollectHealth> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const now = new Date();

  const res = await fetch(
    `${supabaseUrl}/rest/v1/autocollect_items?select=id,status,attempts,last_invited_at&order=updated_at.desc&limit=1000`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to load AutoCollect health data: ${error}`);
  }

  const items = await res.json() as Array<{ id: string; status?: string; attempts?: number; last_invited_at?: string | null }>;
  const dailyCap = getAutoCollectDailyEmailCap(env);
  const sentToday = await getAutoCollectSentTodayCount(env, now);
  const maxAttempts = getAutoCollectMaxAttempts(env);

  const latestInvitedAt = items
    .map((item) => item.last_invited_at ?? null)
    .find((value) => Boolean(value)) ?? null;

  return {
    generated_at: now.toISOString(),
    queue_total: items.length,
    queue_pending: items.filter((item) => (item.status ?? 'pending') === 'pending').length,
    queue_invite_sent: items.filter((item) => (item.status ?? '') === 'invite_sent').length,
    queue_paid: items.filter((item) => (item.status ?? '') === 'paid').length,
    escalations: items.filter((item) => (item.attempts ?? 0) >= maxAttempts).length,
    sent_today: sentToday,
    daily_cap: dailyCap,
    remaining_daily_budget: Math.max(dailyCap - sentToday, 0),
    max_send_per_run: getAutoCollectMaxSendPerRun(env),
    reminder_interval_days: getAutoCollectReminderIntervalDays(env),
    max_attempts: maxAttempts,
    latest_invited_at: latestInvitedAt,
  };
}

function buildPublicStatusModules(autoCollect: AutoCollectHealth | null): PublicStatusModule[] {
  return [
    { id: 1, name: 'Forms', status: 'green', detail: 'Live intake and summary routes are operational.' },
    { id: 2, name: 'Deals / Pipeline', status: 'green', detail: 'Admin pipeline/table workflow is live.' },
    { id: 3, name: 'Proposals', status: 'green', detail: 'Proposal route and generation flow are live.' },
    { id: 4, name: 'AI Price Insights', status: 'green', detail: 'Pricing insight generation is implemented and surfaced.' },
    { id: 5, name: 'Contracts / E-sign', status: 'green', detail: 'Contract generation and signing flow are active.' },
    { id: 6, name: 'Payments', status: 'green', detail: 'Stripe checkout activation flow is operational.' },
    { id: 7, name: 'Billing', status: 'green', detail: 'Admin billing controls are implemented.' },
    { id: 8, name: 'Invoicing', status: 'green', detail: 'Invoice generation and retrieval routes are active.' },
    { id: 9, name: 'Instant Bill', status: 'green', detail: 'One-off payment link flow is live.' },
    {
      id: 10,
      name: 'AutoCollect',
      status: 'yellow',
      detail: autoCollect
        ? `Automation and observability are live; queue=${autoCollect.queue_total}, escalations=${autoCollect.escalations}.`
        : 'Automation is live; health summary unavailable in this response.',
    },
    { id: 11, name: 'Reporting / Insights', status: 'green', detail: 'Client-facing reporting surfaces are live.' },
    { id: 12, name: 'Integrations / Workflows', status: 'green', detail: 'Webhook integrations are live with signed outbound delivery.' },
    { id: 13, name: 'Custom Branding', status: 'green', detail: 'Per-project branding is live for emails and proposal surfaces.' },
  ];
}

async function getPublicStatusSummary(req: Request, env: Env): Promise<PublicStatusSummary> {
  const siteUrl = getSiteUrl(env);
  const workerUrl = new URL(req.url).origin;

  let autoCollect: AutoCollectHealth | null = null;
  try {
    autoCollect = await getAutoCollectHealth(env);
  } catch {
    autoCollect = null;
  }

  return {
    generated_at: new Date().toISOString(),
    report_url: `${siteUrl}/status/`,
    docs: {
      status_doc: `${siteUrl}/status/`,
      master_doc: `${siteUrl}/admin/`,
    },
    score: {
      done: 12,
      in_progress: 1,
      not_started: 0,
      total: 13,
    },
    modules: buildPublicStatusModules(autoCollect),
    testing: [
      { name: 'Smoke', status: 'green', detail: '13/13 automated smoke checks passing.' },
      { name: 'Unit', status: 'yellow', detail: 'No centralized cross-repo unit dashboard yet.' },
      { name: 'Integration', status: 'yellow', detail: 'Integration checks exist but are not yet aggregated in one feed.' },
      { name: 'UAT', status: 'yellow', detail: 'UAT flow is beginning; dedicated artifact rollup pending.' },
      { name: 'BAT', status: 'yellow', detail: 'Business acceptance checklist tracking is planned for next phase.' },
      { name: 'Release Readiness', status: 'yellow', detail: 'Release gate automation is in progress.' },
    ],
    connections: [
      { name: 'Public site', status: 'green', url: siteUrl, detail: 'Primary origin reachable.' },
      { name: 'Worker API', status: 'green', url: workerUrl, detail: 'Stripe worker deployed and responding.' },
      {
        name: 'AutoCollect health',
        status: autoCollect ? 'green' : 'yellow',
        url: `${workerUrl}/api/admin/autocollect/health`,
        detail: autoCollect ? 'Health telemetry available.' : 'Health telemetry unavailable in public summary call.',
      },
    ],
    autocollect: autoCollect,
  };
}

async function handleAdminStatusSummary(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);
  const summary = await getPublicStatusSummary(req, env);
  return json({ ok: true, summary }, 200, origin);
}

// ---------------------------------------------------------------------------
// Phase 10: Leads / Deals
// ---------------------------------------------------------------------------

type Lead = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  message?: string | null;
  source: string;
  status: string;
  notes?: string | null;
  converted_project_id?: string | null;
  created_at: string;
  updated_at: string;
};

async function handlePublicSubmitLead(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: { name?: string; email?: string; company?: string; message?: string; source?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return json({ error: 'Invalid JSON.' }, 400, origin);
  }

  const name = (body.name ?? '').trim().slice(0, 200);
  const email = (body.email ?? '').trim().toLowerCase().slice(0, 320);
  const company = (body.company ?? '').trim().slice(0, 200) || null;
  const message = (body.message ?? '').trim().slice(0, 2000) || null;
  const source = (body.source ?? 'contact_form').trim().slice(0, 60);

  if (!name || !email || !email.includes('@')) {
    return json({ error: 'Name and a valid email are required.' }, 400, origin);
  }

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const res = await fetch(`${supabaseUrl}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ name, email, company, message, source, status: 'new' }),
  });

  if (!res.ok) {
    const err = await res.text();
    return json({ error: 'Failed to save lead.', detail: err }, 500, origin);
  }

  const [lead] = await res.json() as Lead[];

  // Notify admin via email (non-blocking)
  void notifyAdminNewLead(env, { name, email, company, message }).catch(() => {/* ignore */});

  return json({ ok: true, leadId: lead?.id ?? null }, 201, origin);
}

async function notifyAdminNewLead(env: Env, lead: { name: string; email: string; company?: string | null; message?: string | null }): Promise<void> {
  const mailjetKey = cleanSecret(env.MAILJET_API_KEY ?? '');
  const mailjetSecret = cleanSecret(env.MAILJET_SECRET_KEY ?? '');
  if (!mailjetKey || !mailjetSecret) return;

  const subject = `New lead from ${sanitize(lead.name, 80)} — Una Labs`;
  const body = [
    `Name: ${sanitize(lead.name, 200)}`,
    `Email: ${sanitize(lead.email, 320)}`,
    lead.company ? `Company: ${sanitize(lead.company, 200)}` : null,
    '',
    lead.message ? `Message:\n${sanitize(lead.message, 2000)}` : '(no message)',
    '',
    `View leads in admin: https://unalabs.cloud/admin`,
  ].filter(Boolean).join('\n');

  await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${mailjetKey}:${mailjetSecret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: 'noreply@unalabs.cloud', Name: 'Una Labs' },
        To: [{ Email: ADMIN_EMAIL, Name: 'Mike' }],
        Subject: subject,
        TextPart: body,
      }],
    }),
  });
}

async function handleAdminLeadsList(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 200);

  const filter = status ? `&status=eq.${encodeURIComponent(status)}` : '';
  const res = await fetch(
    `${supabaseUrl}/rest/v1/leads?select=*&order=created_at.desc&limit=${limit}${filter}`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );

  if (!res.ok) return json({ error: 'Failed to load leads.' }, 500, origin);
  const leads = await res.json() as Lead[];
  return json({ ok: true, leads }, 200, origin);
}

async function handleAdminUpdateLead(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  if (!id || id === 'leads') return json({ error: 'Lead ID required.' }, 400, origin);

  let body: { status?: string; notes?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return json({ error: 'Invalid JSON.' }, 400, origin);
  }

  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (body.status) patch.status = body.status.trim().slice(0, 60);
  if (typeof body.notes === 'string') patch.notes = body.notes.trim().slice(0, 2000);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(patch),
    }
  );

  if (!res.ok) return json({ error: 'Failed to update lead.' }, 500, origin);
  const [updated] = await res.json() as Lead[];
  return json({ ok: true, lead: updated }, 200, origin);
}

async function handleAdminReprice(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  if (!id || id === 'reprice') return json({ error: 'Project ID required.' }, 400, origin);

  if (!env.OPENAI_API_KEY) return json({ error: 'AI pricing not configured.' }, 503, origin);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  // Fetch project
  const projectRes = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=id,name,description,tier,plan,billing&limit=1`,
    {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }
  );
  if (!projectRes.ok) return json({ error: 'Failed to fetch project.' }, 500, origin);
  const projects = await projectRes.json() as Array<{ id: string; name?: string; description?: string; tier?: string; plan?: string; billing?: string }>;
  if (!projects.length) return json({ error: 'Project not found.' }, 404, origin);
  const project = projects[0];
  const tier = (project.tier ?? project.plan ?? 'professional').toLowerCase();

  const systemPrompt = 'You are a project pricing assistant for Una Labs, a Canadian digital agency. Given a project description and tier, return ONLY valid JSON: {"suggested_min_cad":number,"suggested_max_cad":number,"rationale":"1-2 concise sentences","confidence":"low|medium|high"}. Keep pricing realistic for the tier. No markdown fences. No prose.';

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanSecret(env.OPENAI_API_KEY)}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ description: project.description ?? project.name ?? 'No description', tier, billing: project.billing ?? 'monthly' }) },
      ],
      temperature: 0.4,
      max_tokens: 200,
    }),
  });

  if (!openaiResponse.ok) return json({ error: 'AI pricing request failed.' }, 502, origin);

  const openaiData = (await openaiResponse.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = openaiData.choices?.[0]?.message?.content ?? '';
  let jsonStr = content;
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();

  let priceInsight: PriceInsight | null = null;
  try {
    priceInsight = normalizePriceInsight(JSON.parse(jsonStr), tier);
  } catch {
    priceInsight = null;
  }

  if (!priceInsight) {
    const bounds = AI_PRICE_BOUNDS[tier] ?? AI_PRICE_BOUNDS.professional;
    priceInsight = {
      suggested_min_cad: bounds.min,
      suggested_max_cad: bounds.max,
      rationale: 'Fallback range based on plan tier. Re-run after adding more project context.',
      confidence: 'medium',
    };
  }

  const now = new Date().toISOString();
  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        ai_price_min_cad: priceInsight.suggested_min_cad,
        ai_price_max_cad: priceInsight.suggested_max_cad,
        ai_price_rationale: priceInsight.rationale,
        ai_price_confidence: priceInsight.confidence,
        ai_price_generated_at: now,
      }),
    }
  );

  if (!patchRes.ok) return json({ error: 'Failed to save new price.' }, 500, origin);

  return json({
    ok: true,
    ai_price_min_cad: priceInsight.suggested_min_cad,
    ai_price_max_cad: priceInsight.suggested_max_cad,
    ai_price_rationale: priceInsight.rationale,
    ai_price_confidence: priceInsight.confidence,
    ai_price_generated_at: now,
  }, 200, origin);
}

async function handleAdminGetBranding(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);

  const id = new URL(req.url).pathname.split('/').pop();
  if (!id || id === 'branding') return json({ error: 'Project ID required.' }, 400, origin);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=id,name,branding&limit=1`,
    { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
  );
  if (!res.ok) return json({ error: 'Failed to fetch project.' }, 500, origin);
  const rows = await res.json() as Array<{ id: string; name?: string; branding?: Branding | null }>;
  if (!rows.length) return json({ error: 'Project not found.' }, 404, origin);
  return json({ ok: true, branding: rows[0].branding ?? null }, 200, origin);
}

async function handleAdminSetBranding(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);

  const id = new URL(req.url).pathname.split('/').pop();
  if (!id || id === 'branding') return json({ error: 'Project ID required.' }, 400, origin);

  let body: { companyName?: string; primaryColor?: string; logoUrl?: string; tagline?: string; replyEmail?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return json({ error: 'Invalid JSON.' }, 400, origin);
  }

  const branding: Branding = {};
  if (body.companyName) branding.companyName = sanitize(body.companyName, 80);
  if (body.primaryColor && /^#[0-9a-fA-F]{6}$/.test(body.primaryColor)) branding.primaryColor = body.primaryColor;
  if (body.logoUrl && body.logoUrl.startsWith('https://')) branding.logoUrl = sanitize(body.logoUrl, 300);
  if (body.tagline) branding.tagline = sanitize(body.tagline, 120);
  if (body.replyEmail && body.replyEmail.includes('@') && body.replyEmail.includes('.')) branding.replyEmail = sanitize(body.replyEmail, 120);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ branding }),
    }
  );
  if (!res.ok) return json({ error: 'Failed to save branding.' }, 500, origin);
  return json({ ok: true, branding }, 200, origin);
}

// ── Phase 15: Webhooks ──────────────────────────────────────────────────────

const ALLOWED_EVENTS = [
  'project.created',
  'proposal.sent',
  'payment.received',
  'milestone.approved',
] as const;
type WebhookEvent = typeof ALLOWED_EVENTS[number];

async function signPayload(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fireWebhooks(
  env: Env,
  projectId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const res = await fetch(
    `${supabaseUrl}/rest/v1/webhook_endpoints?project_id=eq.${projectId}&select=id,url,secret,events`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!res.ok) return;
  const endpoints = await res.json() as Array<{ id: string; url: string; secret: string; events: string[] }>;
  const matching = endpoints.filter((ep) => ep.events.length === 0 || ep.events.includes(event));
  if (matching.length === 0) return;
  const payload = JSON.stringify({ event, project_id: projectId, data, timestamp: new Date().toISOString() });
  await Promise.allSettled(
    matching.map(async (ep) => {
      const sig = await signPayload(ep.secret, payload);
      await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Una-Signature': sig, 'X-Una-Event': event },
        body: payload,
      });
    })
  );
}

async function handleAdminListWebhooks(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);
  const projectId = new URL(req.url).pathname.split('/').pop()!;
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const res = await fetch(
    `${supabaseUrl}/rest/v1/webhook_endpoints?project_id=eq.${projectId}&select=id,url,events,created_at&order=created_at.asc`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!res.ok) return json({ error: 'Failed to fetch webhooks.' }, 500, origin);
  return json({ ok: true, endpoints: await res.json() }, 200, origin);
}

async function handleAdminCreateWebhook(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);
  const body = await req.json() as { project_id?: string; url?: string; events?: string[] };
  const projectId = sanitize(String(body.project_id ?? ''));
  const url = sanitize(String(body.url ?? ''));
  const events = Array.isArray(body.events)
    ? body.events.filter((e): e is WebhookEvent => (ALLOWED_EVENTS as readonly string[]).includes(e))
    : [];
  if (!projectId || !url.startsWith('https://')) {
    return json({ error: 'project_id and a valid https:// url are required.' }, 400, origin);
  }
  const secretBytes = crypto.getRandomValues(new Uint8Array(24));
  const secret = Array.from(secretBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const res = await fetch(`${supabaseUrl}/rest/v1/webhook_endpoints`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ project_id: projectId, url, events, secret }),
  });
  if (!res.ok) return json({ error: 'Failed to register webhook.' }, 500, origin);
  const [endpoint] = await res.json() as [{ id: string; url: string; events: string[]; created_at: string }];
  return json({ ok: true, endpoint: { ...endpoint, secret } }, 201, origin);
}

async function handleAdminDeleteWebhook(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);
  const id = new URL(req.url).pathname.split('/').pop()!;
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const res = await fetch(`${supabaseUrl}/rest/v1/webhook_endpoints?id=eq.${id}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return json({ error: 'Failed to delete webhook.' }, 500, origin);
  return json({ ok: true }, 200, origin);
}

// ── Phase 14: Multi-tenancy + Stripe Connect ───────────────────────────────

type ConnectProjectRecord = {
  id: string;
  email: string;
  name?: string | null;
  connect_account_id?: string | null;
  connect_onboarding_complete?: boolean | null;
  connect_details_submitted?: boolean | null;
  connect_charges_enabled?: boolean | null;
  connect_payouts_enabled?: boolean | null;
};

async function fetchProjectConnectRecord(env: Env, projectId: string): Promise<ConnectProjectRecord | null> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const res = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id,email,name,connect_account_id,connect_onboarding_complete,connect_details_submitted,connect_charges_enabled,connect_payouts_enabled&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json() as ConnectProjectRecord[];
  return rows[0] ?? null;
}

async function updateProjectConnectState(
  env: Env,
  projectId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...updates, connect_last_synced_at: new Date().toISOString() }),
  });
}

async function handleAdminGetConnect(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);

  const projectId = new URL(req.url).pathname.split('/').pop()!;
  const project = await fetchProjectConnectRecord(env, projectId);
  if (!project) return json({ error: 'Project not found.' }, 404, origin);

  if (!project.connect_account_id) {
    return json({ ok: true, connected: false, project }, 200, origin);
  }

  try {
    const stripe = getStripe(env);
    const account = await stripe.accounts.retrieve(project.connect_account_id);
    await updateProjectConnectState(env, projectId, {
      connect_onboarding_complete: Boolean(account.details_submitted),
      connect_details_submitted: Boolean(account.details_submitted),
      connect_charges_enabled: Boolean(account.charges_enabled),
      connect_payouts_enabled: Boolean(account.payouts_enabled),
    });

    return json(
      {
        ok: true,
        connected: true,
        project: {
          ...project,
          connect_onboarding_complete: Boolean(account.details_submitted),
          connect_details_submitted: Boolean(account.details_submitted),
          connect_charges_enabled: Boolean(account.charges_enabled),
          connect_payouts_enabled: Boolean(account.payouts_enabled),
        },
      },
      200,
      origin
    );
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to sync Connect account.' }, 502, origin);
  }
}

async function handleAdminConnectOnboard(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 2] ?? '';
  if (!projectId) return json({ error: 'Project ID required.' }, 400, origin);

  const project = await fetchProjectConnectRecord(env, projectId);
  if (!project) return json({ error: 'Project not found.' }, 404, origin);

  try {
    const stripe = getStripe(env);
    let accountId = sanitize(project.connect_account_id ?? '', 80);

    if (!accountId) {
      // Use controller properties (modern Connect shape) instead of legacy account types.
      const account = await stripe.accounts.create({
        country: 'CA',
        email: project.email,
        business_type: 'company',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        controller: {
          losses: { payments: 'application' },
          fees: { payer: 'application' },
          stripe_dashboard: { type: 'express' },
        },
      } as unknown as Stripe.AccountCreateParams);
      accountId = account.id;
      await updateProjectConnectState(env, projectId, { connect_account_id: accountId });
    }

    const siteUrl = getSiteUrl(env);
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/admin?connect=${encodeURIComponent(projectId)}&state=refresh`,
      return_url: `${siteUrl}/admin?connect=${encodeURIComponent(projectId)}&state=return`,
      type: 'account_onboarding',
    });

    return json({ ok: true, account_id: accountId, onboarding_url: link.url, expires_at: link.expires_at }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to generate onboarding link.' }, 502, origin);
  }
}

async function handleAdminConnectDashboard(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, 401, origin);

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 2] ?? '';
  if (!projectId) return json({ error: 'Project ID required.' }, 400, origin);

  const project = await fetchProjectConnectRecord(env, projectId);
  if (!project?.connect_account_id) {
    return json({ error: 'No Connect account linked for this project.' }, 400, origin);
  }

  try {
    const stripe = getStripe(env);
    const login = await stripe.accounts.createLoginLink(project.connect_account_id);
    return json({ ok: true, dashboard_url: login.url }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to create dashboard link.' }, 502, origin);
  }
}

async function reconcilePaidAutoCollectItems(env: Env): Promise<number> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const itemRes = await fetch(
    `${supabaseUrl}/rest/v1/autocollect_items?status=not.eq.paid&select=id,invoice_id,project_id,amount_cad&limit=500`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );

  if (!itemRes.ok) {
    const error = await itemRes.text();
    throw new Error(`Failed to load AutoCollect items for reconciliation: ${error}`);
  }

  const items = await itemRes.json() as Array<{ id: string; invoice_id: string; project_id?: string; amount_cad?: string | number }>;
  if (!items.length) return 0;

  const invoiceIds = Array.from(new Set(items.map((item) => item.invoice_id).filter(Boolean)));
  if (!invoiceIds.length) return 0;

  const invoiceClause = invoiceIds.map((id) => encodeURIComponent(id)).join(',');
  const invoiceRes = await fetch(
    `${supabaseUrl}/rest/v1/invoices?id=in.(${invoiceClause})&select=id,status,paid_at`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );

  if (!invoiceRes.ok) {
    const error = await invoiceRes.text();
    throw new Error(`Failed to load invoices for reconciliation: ${error}`);
  }

  const invoices = await invoiceRes.json() as Array<{ id: string; status?: string; paid_at?: string | null }>;
  const paidInvoiceIds = new Set(
    invoices
      .filter((invoice) => (invoice.status ?? '').toLowerCase() === 'paid' || Boolean(invoice.paid_at))
      .map((invoice) => invoice.id)
  );

  if (!paidInvoiceIds.size) return 0;

  const paidItems = items.filter((item) => paidInvoiceIds.has(item.invoice_id));
  const paidItemIds = paidItems.map((item) => item.id);

  if (!paidItemIds.length) return 0;
  const markedCount = await markAutoCollectItemsPaidByIds(env, paidItemIds);

  // Phase 15: fire payment.received per project (best-effort, grouped)
  const projectsWithPayments = new Map<string, number>();
  for (const item of paidItems) {
    if (item.project_id) {
      projectsWithPayments.set(item.project_id, (projectsWithPayments.get(item.project_id) ?? 0) + 1);
    }
  }
  for (const [projectId, count] of projectsWithPayments) {
    void fireWebhooks(env, projectId, 'payment.received', { items_reconciled: count });
  }

  return markedCount;
}

async function reconcilePaidInstantBills(env: Env, projectId?: string): Promise<number> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const stripe = getStripe(env);
  const filters = [
    'select=id,project_id,stripe_payment_link_id,status,paid_at',
    'status=not.eq.paid',
    'limit=100',
  ];
  if (projectId) filters.push(`project_id=eq.${encodeURIComponent(projectId)}`);

  const res = await fetch(`${supabaseUrl}/rest/v1/instant_bills?${filters.join('&')}`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to load instant bills for reconciliation: ${error}`);
  }

  const items = await res.json() as Array<{
    id: string;
    project_id: string;
    stripe_payment_link_id?: string;
    status?: string;
    paid_at?: string | null;
  }>;
  if (!items.length) return 0;

  let updated = 0;
  for (const item of items) {
    if (!item.stripe_payment_link_id) continue;
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_link: item.stripe_payment_link_id,
        limit: 10,
      } as Stripe.Checkout.SessionListParams);
      const paidSession = sessions.data.find((session) =>
        session.payment_status === 'paid' || session.status === 'complete',
      );
      if (!paidSession) continue;

      const patchRes = await fetch(`${supabaseUrl}/rest/v1/instant_bills?id=eq.${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          status: 'paid',
          paid_at: paidSession.created ? new Date(paidSession.created * 1000).toISOString() : new Date().toISOString(),
        }),
      });
      if (patchRes.ok) updated += 1;
    } catch (error) {
      logEvent('instant_bill_reconcile_error', {
        projectId: item.project_id,
        instantBillId: item.id,
        error: error instanceof Error ? error.message : 'Unknown instant bill reconciliation error.',
      });
    }
  }

  return updated;
}

function mapClientStatus(internalStatus: string): { label: string; description: string } {
  switch ((internalStatus || 'intake').toLowerCase()) {
    case 'scoped':
      return { label: 'Discovery', description: 'We are drafting and reviewing the initial scope pack internally.' };
    case 'awaiting_approval':
      return { label: 'Plan Pending Approval', description: 'Your scope pack is ready and waiting on your review, signature, or deposit approval.' };
    case 'active':
      return { label: 'In Progress', description: 'Build work is underway.' };
    case 'review':
      return { label: 'Waiting on Feedback', description: 'We are waiting on your review before the next step can begin.' };
    case 'complete':
      return { label: 'Delivered', description: 'The agreed delivery is complete.' };
    case 'support':
      return { label: 'Ongoing Support', description: 'The project is in its support or maintenance lane.' };
    case 'paused':
      return { label: 'Pending Next Step', description: 'The project is paused until the next explicit action is taken.' };
    default:
      return { label: 'Discovery', description: 'We are capturing context and opening the project workspace.' };
  }
}

async function sendAutoCollectInviteForItem(env: Env, item: AutoCollectRecord, options?: { force?: boolean; ignoreDailyCap?: boolean }): Promise<AutoCollectInviteResult> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  if (!options?.force) {
    const eligibility = shouldSendAutoCollectReminder(item, env);
    if (!eligibility.eligible) {
      return { ok: false, skipped: eligibility.reason, item };
    }
  }

  if (!options?.ignoreDailyCap) {
    const dailyCap = getAutoCollectDailyEmailCap(env);
    const sentToday = await getAutoCollectSentTodayCount(env);
    if (sentToday >= dailyCap) {
      return { ok: false, skipped: `daily_email_cap_reached:${dailyCap}`, item };
    }
  }

  const invoiceRes = await fetch(`${supabaseUrl}/rest/v1/invoices?id=eq.${encodeURIComponent(item.invoice_id)}&select=milestone_id,title,status`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!invoiceRes.ok) return { ok: false, error: 'Failed to fetch invoice details.' };
  const invoiceRows = await invoiceRes.json() as Array<{ milestone_id: string; title?: string; status?: string }>;
  const invoiceMeta = invoiceRows[0];
  if (!invoiceMeta) return { ok: false, error: 'Invoice details not found.' };
  if ((invoiceMeta.status ?? '').toLowerCase() === 'paid') {
    await markAutoCollectItemsPaidByIds(env, [item.id]).catch((error) => {
      logEvent('autocollect_reconcile_on_send_failed', {
        autocollect_id: item.id,
        invoice_id: item.invoice_id,
        error: error instanceof Error ? error.message : 'Unknown reconcile-on-send error.',
      });
    });
    return { ok: false, skipped: 'invoice_already_paid', item };
  }

  const projectRes = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(item.project_id)}&select=name,email`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!projectRes.ok) return { ok: false, error: 'Failed to fetch project details.' };
  const projects = await projectRes.json() as Array<{ name?: string; email: string }>;
  const project = projects[0];

  const siteUrl = getSiteUrl(env);
  const invoiceLink = `${siteUrl}/dashboard/invoice?milestone_id=${encodeURIComponent(invoiceMeta.milestone_id)}`;

  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) {
    const subject = `Payment reminder: ${item.invoice_number} is overdue`;
    const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#F97316;border-radius:8px;padding:16px 20px;margin-bottom:20px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Payment reminder</p>
  </div>
  <p style="font-size:14px;color:#111827">Hi ${sanitize(project?.name || item.client_email, 120)},</p>
  <p style="font-size:14px;color:#111827">This is a friendly reminder that invoice <strong>${item.invoice_number}</strong> is still unpaid.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0 20px">
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Amount</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">CA$${Number(item.amount_cad).toLocaleString('en-CA')}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Due date</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${item.due_date}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Invoice</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${sanitize(invoiceMeta.title || item.invoice_number, 140)}</td></tr>
  </table>
  <p><a href="${invoiceLink}" style="display:inline-block;padding:10px 16px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View invoice</a></p>
</div>`;

    const delivery = await sendMailjetMessages(env, {
        Messages: [
          {
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: item.client_email, Name: sanitize(project?.name || item.client_email, 120) }],
            Subject: subject,
            HTMLPart: html,
            TextPart: `${subject}\n\nAmount: CA$${item.amount_cad}\nDue date: ${item.due_date}\nView invoice: ${invoiceLink}`,
          },
          {
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: ADMIN_EMAIL, Name: 'Mike' }],
            Subject: `[Admin] ${subject}`,
            HTMLPart: html,
            TextPart: `[Admin] ${subject}\nClient: ${item.client_email}\nAmount: CA$${item.amount_cad}\nDue date: ${item.due_date}\nInvoice link: ${invoiceLink}`,
          },
        ],
    });

    if (!delivery.ok) {
      return {
        ok: false,
        error: `AutoCollect reminder email not sent (${delivery.status || 'network'}): ${delivery.error ?? 'unknown email error'}`,
      };
    }
  } else {
    return { ok: false, error: 'AutoCollect reminder email not sent: Mailjet is not configured.' };
  }

  const attempts = Number.isFinite(item.attempts) ? item.attempts + 1 : 1;
  const updateRes = await fetch(`${supabaseUrl}/rest/v1/autocollect_items?id=eq.${encodeURIComponent(item.id)}&select=*`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      status: 'invite_sent',
      attempts,
      last_invited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: attempts >= getAutoCollectMaxAttempts(env) ? 'max_attempts_reached' : item.notes,
    }),
  });

  if (!updateRes.ok) {
    const error = await updateRes.text();
    return { ok: false, error: `Failed to update AutoCollect item: ${error}` };
  }

  const rows = await updateRes.json() as AutoCollectRecord[];
  return { ok: true, item: rows[0] };
}

async function runAutoCollectReminderCycle(env: Env): Promise<{ synced: number; reconciled_paid: number; invited: number; skipped: number; errors: number }> {
  const syncResult = await syncAutoCollectItems(env, { overdueOnly: true, limit: 200 });
  const dailyCap = getAutoCollectDailyEmailCap(env);
  const maxSendPerRun = getAutoCollectMaxSendPerRun(env);
  const sentToday = await getAutoCollectSentTodayCount(env);
  const remainingDailyBudget = Math.max(dailyCap - sentToday, 0);
  const runBudget = Math.min(remainingDailyBudget, maxSendPerRun);

  let invited = 0;
  let skipped = 0;
  let errors = 0;

  if (runBudget <= 0) {
    return {
      synced: syncResult.synced,
      reconciled_paid: syncResult.reconciled_paid,
      invited,
      skipped: syncResult.items.length,
      errors,
    };
  }

  for (let i = 0; i < syncResult.items.length; i += 1) {
    const item = syncResult.items[i];

    if (invited >= runBudget) {
      skipped += (syncResult.items.length - i);
      break;
    }

    const result = await sendAutoCollectInviteForItem(env, item, { ignoreDailyCap: true });
    if (result.ok) {
      invited += 1;
      continue;
    }
    if (result.skipped) {
      skipped += 1;
      continue;
    }
    errors += 1;
    logEvent('autocollect_invite_error', {
      autocollect_id: item.id,
      invoice_id: item.invoice_id,
      error: result.error ?? 'Unknown AutoCollect send error.',
    });
  }

  return {
    synced: syncResult.synced,
    reconciled_paid: syncResult.reconciled_paid,
    invited,
    skipped,
    errors,
  };
}

async function verifyUser(req: Request, env: Env): Promise<{ ok: true; user: AuthenticatedUser } | { ok: false; error: string; status: number }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Missing Authorization header.', status: 401 };
  }

  try {
    const token = authHeader.slice(7);
    const apiKey = getSupabaseApiKey(env);
    const res = await fetch(`${cleanSecret(env.SUPABASE_URL!)}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': apiKey,
      },
    });
    if (!res.ok) return { ok: false, error: 'Invalid token.', status: 401 };
    const user = await res.json() as { email?: string };
    if (!user.email) return { ok: false, error: 'User email unavailable.', status: 401 };
    return { ok: true, user: { email: user.email.toLowerCase() } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Authentication failed.', status: 401 };
  }
}

async function verifyAdmin(req: Request, env: Env): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const auth = await verifyUser(req, env);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (auth.user.email !== ADMIN_EMAIL) return { ok: false, error: 'Forbidden.' };
  return { ok: true, email: auth.user.email };
}

function renderContractBody(project: ContractProject, milestones: ContractMilestone[]): string {
  const projectTitle = sanitize(project.name || `Project ${project.id.slice(0, 8)}`, 160);
  const tierLabel = sanitize(project.tier || 'professional', 60);
  const billingLabel = sanitize(project.billing || 'monthly', 60);
  const kickoffDate = project.created_at ? new Date(project.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'the activation date';
  const milestoneLines = milestones.length > 0
    ? milestones.map((milestone, index) => `${index + 1}. ${sanitize(milestone.title || `Milestone ${index + 1}`, 160)}${milestone.due_date ? ` — target ${sanitize(milestone.due_date, 40)}` : ''}`).join('\n')
    : '1. Scope definition and execution milestones will be managed inside the Una Labs dashboard.';

  return [
    `ENGAGEMENT LETTER`,
    ``,
    `This engagement letter confirms that Una Labs will deliver the project work for ${projectTitle}. The engagement begins on ${kickoffDate}.`,
    ``,
    `SERVICE MODEL`,
    `Una Labs will provide implementation, delivery coordination, and milestone-based approvals through the client dashboard and portal.`,
    ``,
    `PLAN AND BILLING`,
    `The project is attached to the ${tierLabel} plan with ${billingLabel} billing. Trial, billing, and subscription handling continue through Stripe and the Una Labs billing flow already accepted at checkout.`,
    ``,
    `INITIAL DELIVERY SCOPE`,
    milestoneLines,
    ``,
    `CLIENT RESPONSIBILITIES`,
    `The client will provide timely access, required materials, and feedback during milestone review. Delays in approvals or dependencies may shift delivery dates.`,
    ``,
    `APPROVAL AND CHANGE CONTROL`,
    `Milestones submitted in the portal may be approved or returned with requested changes. Approval marks that milestone as accepted for the current scope.`,
    ``,
    `CONFIDENTIALITY`,
    `Una Labs will treat project information as confidential and will not disclose sensitive materials except as required to deliver the work or comply with law.`,
    ``,
    `TERM`,
    `This engagement remains in effect while the project is active unless cancelled under the billing terms or replaced by a later written agreement.`,
    ``,
    `SIGNATURE`,
    `By signing below, the client confirms authority to enter this engagement and accepts the project scope and operating terms described above.`,
  ].join('\n');
}

async function fetchProjectForContract(env: Env, projectId: string): Promise<ContractProject | null> {
  const serviceKey = getSupabaseServiceKey(env);
  const response = await fetch(`${cleanSecret(env.SUPABASE_URL!)}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id,email,name,tier,billing,status,created_at`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!response.ok) throw new Error(`Project lookup failed: ${response.status}`);
  const payload = await response.json() as ContractProject[];
  return payload[0] ?? null;
}

async function fetchMilestonesForContract(env: Env, projectId: string): Promise<ContractMilestone[]> {
  const serviceKey = getSupabaseServiceKey(env);
  const response = await fetch(`${cleanSecret(env.SUPABASE_URL!)}/rest/v1/milestones?project_id=eq.${encodeURIComponent(projectId)}&select=id,title,due_date,status&order=due_date.asc`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!response.ok) throw new Error(`Milestone lookup failed: ${response.status}`);
  return await response.json() as ContractMilestone[];
}

async function fetchExistingContract(env: Env, projectId: string): Promise<ContractRecord | null> {
  const serviceKey = getSupabaseServiceKey(env);
  const response = await fetch(`${cleanSecret(env.SUPABASE_URL!)}/rest/v1/contracts?project_id=eq.${encodeURIComponent(projectId)}&select=*`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!response.ok) throw new Error(`Contract lookup failed: ${response.status}`);
  const payload = await response.json() as ContractRecord[];
  return payload[0] ?? null;
}

async function upsertContractDraft(env: Env, project: ContractProject, milestones: ContractMilestone[], existing: ContractRecord | null): Promise<ContractRecord> {
  const serviceKey = getSupabaseServiceKey(env);
  const now = new Date().toISOString();
  const title = `${sanitize(project.name || 'Project', 120)} Engagement Letter`;
  const body = renderContractBody(project, milestones);

  if (existing?.status === 'signed') {
    return existing;
  }

  const payload = existing
    ? {
        title,
        body,
        updated_at: now,
      }
    : {
        project_id: project.id,
        title,
        body,
        status: 'sent',
        sent_at: now,
        updated_at: now,
      };

  const target = existing
    ? `${cleanSecret(env.SUPABASE_URL!)}/rest/v1/contracts?id=eq.${encodeURIComponent(existing.id)}`
    : `${cleanSecret(env.SUPABASE_URL!)}/rest/v1/contracts`;

  const response = await fetch(target, {
    method: existing ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Contract upsert failed: ${response.status}`);
  const rows = await response.json() as ContractRecord[];
  return rows[0];
}

async function ensureContractForProject(env: Env, projectId: string, userEmail: string): Promise<{ project: ContractProject; milestones: ContractMilestone[]; contract: ContractRecord }> {
  const project = await fetchProjectForContract(env, projectId);
  if (!project) throw new Error('Project not found.');
  if (userEmail !== ADMIN_EMAIL && project.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error('Forbidden.');
  }

  const [milestones, existing] = await Promise.all([
    fetchMilestonesForContract(env, projectId),
    fetchExistingContract(env, projectId),
  ]);
  const contract = await upsertContractDraft(env, project, milestones, existing);
  return { project, milestones, contract };
}

async function sendContractSignedNotifications(env: Env, project: ContractProject, contract: ContractRecord): Promise<void> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) return;

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
  const projectTitle = project.name || `Project ${project.id.slice(0, 8)}`;
  const signedAt = contract.signed_at ? new Date(contract.signed_at).toLocaleString('en-CA') : 'just now';
  const signerName = contract.signer_name || contract.signer_email || 'Client';
  const subject = `Contract signed: ${projectTitle}`;
  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Engagement letter signed</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Project</td><td style="padding:4px 0;font-size:13px;color:#0B0E11">${projectTitle}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Signer</td><td style="padding:4px 0;font-size:13px;color:#0B0E11">${signerName}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Email</td><td style="padding:4px 0;font-size:13px;color:#0B0E11">${contract.signer_email ?? project.email}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Signed at</td><td style="padding:4px 0;font-size:13px;color:#0B0E11">${signedAt}</td></tr>
  </table>
  <p style="font-size:12px;color:#9CA3AF">Una Labs contracts · unalabs.cloud</p>
</div>`;

  await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
          To: [{ Email: ADMIN_EMAIL, Name: 'Mike' }],
          Subject: subject,
          HTMLPart: html,
          TextPart: `${subject}\n\nProject: ${projectTitle}\nSigner: ${signerName}\nEmail: ${contract.signer_email ?? project.email}\nSigned at: ${signedAt}`,
        },
        {
          From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
          To: [{ Email: contract.signer_email ?? project.email, Name: signerName }],
          Subject: `Signed copy received — ${projectTitle}`,
          HTMLPart: html,
          TextPart: `Signed copy received for ${projectTitle}.\n\nSigner: ${signerName}\nSigned at: ${signedAt}\n\nUna Labs · unalabs.cloud`,
        },
      ],
    }),
  });
}

function getStripe(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return new Stripe(cleanSecret(env.STRIPE_SECRET_KEY), {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function getSiteUrl(env: Env): string {
  return (env.UNALABS_SITE_URL || 'https://unalabs.cloud').replace(/\/+$/, '');
}

function getCheckoutSuccessUrl(req: Request, env: Env): string {
  const workerOrigin = new URL(req.url).origin;
  return `${workerOrigin}/api/checkout-success?session_id={CHECKOUT_SESSION_ID}&site_url=${encodeURIComponent(getSiteUrl(env))}`;
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
    enterprise_annual: env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  };
  const val = map[`${tier}_${billing}`];
  return val ? cleanSecret(val) : undefined;
}

async function handleCreateCheckoutSession(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const email = sanitize(body.email);
  const tier = sanitize(body.tier).toLowerCase();
  const billing = sanitize(body.billing).toLowerCase();
  const intakeId = sanitize(body.intake_id);
  const checkoutType = normalizeCheckoutType(sanitize(body.checkout_type).toLowerCase());
  const serviceType = sanitize(body.service_type).toLowerCase() || 'custom_project_activation';
  const founderOverride = sanitize(body.founder_override).toLowerCase() === 'true';
  const creditTowardBuild = sanitize(body.credit_toward_build).toLowerCase() === 'true';
  const requestedAmountCad = Number(body.amount_cad);

  if (!email || !email.includes('@')) {
    return json({ error: 'A valid email is required.' }, 400, origin);
  }

  const siteUrl = getSiteUrl(env);

  let stripe: Stripe;
  try {
    stripe = getStripe(env);
  } catch {
    return json({ error: 'Payment service is not configured.' }, 500, origin);
  }

  try {
    logEvent('create_checkout_session_start', {
      email,
      tier,
      billing,
      checkoutType,
      serviceType,
      intakeId,
      origin,
      stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
    });

    let session: Stripe.Checkout.Session;

    if (checkoutType === 'activation') {
      if (!isActivationTier(tier)) {
        return json({ error: 'Invalid activation band.' }, 400, origin);
      }

      const amountCad = Number.isFinite(requestedAmountCad)
        ? requestedAmountCad
        : ACTIVATION_TIER_PRICES[tier];

      const metadata = {
        email,
        tier,
        billing: 'one_time',
        intake_id: intakeId,
        checkout_type: 'activation',
        service_type: serviceType,
        amount_cad: String(amountCad),
        founder_override: founderOverride ? 'true' : 'false',
        credit_toward_build: creditTowardBuild ? 'true' : 'false',
      };

      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'cad',
              unit_amount: Math.round(amountCad * 100),
              product_data: {
                name: ACTIVATION_TIER_LABELS[tier],
                description:
                  'Project activation for intake capture, scoped brief, roadmap, and initial pricing recommendation.',
              },
            },
            quantity: 1,
          },
        ],
        success_url: getCheckoutSuccessUrl(req, env),
        cancel_url: `${siteUrl}/start-project/summary`,
        metadata,
        payment_intent_data: { metadata },
        billing_address_collection: 'required',
        phone_number_collection: { enabled: false },
        locale: 'en',
      });
    } else {
      if (!isSubscriptionTier(tier)) {
        return json({ error: 'Invalid plan tier.' }, 400, origin);
      }
      if (!['monthly', 'annual'].includes(billing)) {
        return json({ error: 'Billing must be monthly or annual.' }, 400, origin);
      }

      const priceId = getPriceId(env, tier, billing);
      if (!priceId) {
        return json({ error: `Stripe price for ${tier}/${billing} is not configured.` }, 500, origin);
      }

      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: getCheckoutSuccessUrl(req, env),
        cancel_url: `${siteUrl}/pricing`,
        metadata: {
          email,
          tier,
          billing,
          intake_id: intakeId,
          checkout_type: 'subscription',
          service_type: 'platform_subscription',
          amount_cad: '0',
          founder_override: 'false',
          credit_toward_build: 'false',
        },
        subscription_data: { trial_period_days: 14 },
        billing_address_collection: 'required',
        phone_number_collection: { enabled: false },
        locale: 'en',
      });
    }

    logEvent('create_checkout_session_success', {
      email,
      tier,
      billing,
      checkoutType,
      intakeId,
      livemode: session.livemode,
      sessionId: session.id,
    });
    return json({ url: session.url }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error.';
    logEvent('create_checkout_session_error', {
      email,
      tier,
      billing,
      checkoutType,
      intakeId,
      message,
    });
    return json({ error: message }, 500, origin);
  }
}

async function writeProjectToSupabase(env: Env, activation: {
  email: string;
  tier: string;
  billing: string;
  checkout_type: 'subscription' | 'activation';
  service_type: string;
  amount_cad: number;
  founder_override: boolean;
  credit_toward_build: boolean;
  intake_id: string;
  session_id: string;
  created_at: string;
}, intake: Record<string, string>): Promise<ProjectWriteResult> {
  if (!env.SUPABASE_URL || (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY)) {
    return { attempted: false, inserted: false, duplicate: false, status: 0, error: 'Supabase env not configured.' };
  }

  const supabaseKey = cleanSecret(env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? '');

  const response = await fetch(`${cleanSecret(env.SUPABASE_URL)}/rest/v1/projects?on_conflict=stripe_session_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify({
      email: activation.email.toLowerCase(),
      intake_id: activation.intake_id,
      name: sanitize(intake.projectTitle || intake.name, 120),
      tier: activation.tier,
      billing: activation.billing,
      stripe_session_id: activation.session_id,
      status: 'intake',
    }),
  });

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) as Array<Record<string, unknown>> : [];
  if (!response.ok) {
    return {
      attempted: true,
      inserted: false,
      duplicate: false,
      status: response.status,
      error: raw || 'Unknown Supabase error.',
    };
  }

  const projectId = payload.length > 0 ? String(payload[0].id ?? '') : undefined;
  return {
    attempted: true,
    inserted: payload.length > 0,
    duplicate: payload.length === 0,
    projectId,
    status: response.status,
  };
}

async function deliverWebhook(
  url: string | undefined,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<DeliveryResult> {
  if (!url) {
    return { attempted: false, delivered: false, status: 0 };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return {
      attempted: true,
      delivered: response.ok,
      status: response.status,
      error: response.ok ? undefined : await response.text(),
    };
  } catch (error) {
    return {
      attempted: true,
      delivered: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown delivery error.',
    };
  }
}

async function fetchProjectBranding(env: Env, projectId: string): Promise<Branding | null> {
  try {
    const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
    const serviceKey = getSupabaseServiceKey(env);
    const brandingRes = await fetch(
      `${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=branding&limit=1`,
      { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } },
    );
    if (!brandingRes.ok) return null;
    const [row] = await brandingRes.json() as Array<{ branding?: Branding | null }>;
    return row?.branding ?? null;
  } catch {
    return null;
  }
}

async function sendScopeReadyClientEmail(
  env: Env,
  projectId: string,
  activation: Pick<ActivationPayload, 'email' | 'tier' | 'billing'>,
  intake: Record<string, string>,
  draft: ScopeDraft,
): Promise<void> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) return;

  const name = intake.name || activation.email.split('@')[0];
  const firstName = name.split(' ')[0];
  const today = new Date();
  const projectBranding = await fetchProjectBranding(env, projectId);
  const brandingColor = projectBranding?.primaryColor ?? '#4DB8A8';
  const brandingName = projectBranding?.companyName ?? 'Una Labs';
  const brandingLogoHtml = projectBranding?.logoUrl
    ? `<img src="${projectBranding.logoUrl}" alt="${brandingName}" style="height:28px;margin-bottom:6px;display:block">`
    : '';
  const brandingTaglineHtml = projectBranding?.tagline
    ? `<p style="color:rgba(255,255,255,0.8);font-size:11px;margin:3px 0 0">${projectBranding.tagline}</p>`
    : '';
  const fromEmail = projectBranding?.replyEmail ?? 'hello@unalabs.cloud';
  const footerLine = projectBranding?.companyName
    ? `Questions? Reply here or email ${fromEmail}<br>${brandingName}`
    : 'Questions? Reply here or email hello@unalabs.cloud<br>Una Labs | unalabs.cloud';
  const dashboardLink = `https://unalabs.cloud/login?redirect=/portal?id=${encodeURIComponent(projectId)}`;
  const milestonesHtml = draft.milestones
    .map((milestone, index) => {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + ([7, 21, 45][index] ?? milestone.due_offset_days ?? 0));
      const dateStr = dueDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#0B0E11;font-size:14px">${milestone.title}</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:14px">${dateStr}</td></tr>`;
    })
    .join('');

  const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <div style="background:${brandingColor};border-radius:8px;padding:16px 20px;margin-bottom:24px">
    ${brandingLogoHtml}
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Your scoped plan is ready for review</p>
    ${brandingTaglineHtml}
  </div>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:16px">Hi ${firstName},</p>
  <p style="font-size:14px;color:#374151;margin-bottom:14px">We've finished the structured scope pack for your project. You can now review the plan, milestones, and next approval step in your client portal.</p>
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px;margin-bottom:20px">
    <p style="margin:0 0 6px;color:#6B7280;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Why this phase matters</p>
    <p style="margin:0;color:#0B0E11;font-size:14px;font-weight:600">${sanitize(draft.problem_statement, 220)}</p>
    <p style="margin:8px 0 0;color:#374151;font-size:13px;line-height:1.6">${sanitize(draft.solution_direction, 260)}</p>
  </div>
  ${draft.pricing ? `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px;margin-bottom:20px"><p style="margin:0 0 4px;color:#6B7280;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Build recommendation</p><p style="margin:0;color:#0B0E11;font-size:14px;font-weight:700">CA$${draft.pricing.suggested_min_cad.toLocaleString('en-CA')} - CA$${draft.pricing.suggested_max_cad.toLocaleString('en-CA')}</p><p style="margin:6px 0 0;color:#374151;font-size:12px">${draft.pricing.rationale}</p></div>` : ''}
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr><th style="padding:8px 12px;text-align:left;background:#F9FAFB;color:#6B7280;font-size:13px;font-weight:600;border-bottom:1px solid #E5E7EB">Milestone</th><th style="padding:8px 12px;text-align:left;background:#F9FAFB;color:#6B7280;font-size:13px;font-weight:600;border-bottom:1px solid #E5E7EB">Target date</th></tr>
    ${milestonesHtml}
  </table>
  <a href="${dashboardLink}" style="display:inline-block;background:#F97316;color:white;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px">Review project portal</a>
  <p style="font-size:12px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px">${footerLine}</p>
</div>`;

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
  await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: fromEmail, Name: brandingName },
          To: [{ Email: activation.email, Name: name }],
          Subject: `Your scoped plan is ready - ${brandingName}`,
          HTMLPart: html,
          TextPart: `Hi ${firstName},\n\nYour scoped plan is ready for review.\n\n${draft.problem_statement}\n\n${draft.solution_direction}\n\nReview it here: ${dashboardLink}\n\nQuestions? Reply here or email ${fromEmail}\n\n${brandingName}`,
        },
      ],
    }),
  });
}

async function sendScopeGeneratedAdminEmail(
  env: Env,
  projectId: string,
  activation: Pick<ActivationPayload, 'email' | 'tier'>,
  intake: Record<string, string>,
  draft: ScopeDraft,
): Promise<void> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) return;

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
  const company = intake.company || intake.name || activation.email;
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:20px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Scope draft generated</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Client</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#0B0E11">${company}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Activation band</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${getTierLabel(draft.activation_band)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Email</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${activation.email}</td></tr>
    ${draft.pricing ? `<tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">AI price insight</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">CA$${draft.pricing.suggested_min_cad.toLocaleString('en-CA')} - CA$${draft.pricing.suggested_max_cad.toLocaleString('en-CA')} (${draft.pricing.confidence})</td></tr>` : ''}
  </table>
  <p style="font-size:13px;color:#6B7280;margin-bottom:12px;font-weight:600">Recommended milestones:</p>
  <ul style="padding-left:20px;margin:0 0 20px;color:#0B0E11;font-size:13px;line-height:1.8">
    ${draft.milestones.map((milestone) => `<li>${milestone.title}</li>`).join('')}
  </ul>
  <p style="font-size:12px;color:#9CA3AF">Project ID: ${projectId}</p>
</div>`;

  await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
          To: [{ Email: 'mike.fejiro@gmail.com', Name: 'Mike' }],
          Subject: `Scope draft ready - ${company}`,
          HTMLPart: html,
          TextPart: `Scope draft ready\n\nClient: ${company}\nActivation band: ${getTierLabel(draft.activation_band)}\nEmail: ${activation.email}\nProject ID: ${projectId}`,
        },
      ],
    }),
  });
}

async function createScopedProjectDraft(
  env: Env,
  intake: Record<string, string>,
  draft: ScopeDraft,
  options?: { stripeSessionId?: string },
): Promise<{ project: Record<string, unknown>; projectId: string }> {
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const syntheticIntakeId = sanitize(
    intake.intakeId || `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    120,
  );
  const name = sanitize(intake.projectTitle || intake.name || intake.company || 'Custom project', 120);
  const response = await fetch(`${supabaseUrl}/rest/v1/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      email: sanitize(intake.email, 160).toLowerCase(),
      intake_id: syntheticIntakeId,
      name,
      tier: draft.activation_band,
      billing: 'one_time',
      status: 'scoped',
      ...(options?.stripeSessionId ? { stripe_session_id: options.stripeSessionId } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Project draft insert failed: ${error}`);
  }

  const rows = await response.json() as Array<Record<string, unknown>>;
  const project = rows[0];
  const projectId = String(project?.id ?? '');
  if (!projectId) throw new Error('Project draft insert returned no id.');
  return { project, projectId };
}

async function generateAndWriteScopeDraft(
  projectId: string | undefined,
  intake: Record<string, string>,
  activation: ActivationPayload,
  env: Env,
): Promise<ScopeDraft | null> {
  if (!projectId) {
    logEvent('generate_scope_project_missing', {});
    return null;
  }

  try {
    const draft = await generateScopeDraftFromIntake(intake, activation, env);
    await writeScopeDraftToSupabase(projectId, draft, env, { status: 'scoped' });
    await sendScopeGeneratedAdminEmail(env, projectId, activation, intake, draft);
    void fireWebhooks(env, projectId, 'proposal.sent', {
      project_id: projectId,
      email: activation.email,
      milestones: draft.milestones.map((milestone) => milestone.title),
    });
    logEvent('generate_scope_written', {
      projectId,
      milestones: draft.milestones.length,
      activation_band: draft.activation_band,
    });
    return draft;
  } catch (error) {
    logEvent('generate_scope_write_exception', {
      projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

async function generateAndWriteScope(
  projectId: string | undefined,
  intake: Record<string, string>,
  activation: ActivationPayload,
  env: Env
): Promise<void> {
  if (!projectId) {
    console.log('generateAndWriteScope: projectId missing, skipping.');
    return;
  }

  // Step 1: Call OpenAI API to generate milestones and a price insight range
  let milestones: Array<{ title: string; description: string; due_offset_days: number }> = [];
  let priceInsight: PriceInsight | null = null;
  if (env.OPENAI_API_KEY && env.SUPABASE_SERVICE_ROLE_KEY && env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) {
    try {
      const intakePayload = {
        name: intake.name || '',
        email: intake.email || activation.email,
        company: intake.company || '',
        role: intake.role || '',
        teamSize: intake.teamSize || '',
        plan: intake.plan || activation.tier,
        billing: intake.billing || activation.billing,
      };

      // Determine if this is a realtor lead intake
      const intakeId = activation.intake_id || intake.intakeId || '';
      const isRealtorLead = intakeId?.includes('realtor_') || intake.type === 'realtor_lead';
      
      let systemPrompt = 'You are a project scoping assistant for Una Labs, a Canadian digital agency. Given a client intake, return ONLY valid JSON with this exact shape: {"milestones":[{"title":"...","description":"...","due_offset_days":7},{"title":"...","description":"...","due_offset_days":21},{"title":"...","description":"...","due_offset_days":45}],"pricing":{"suggested_min_cad":number,"suggested_max_cad":number,"rationale":"1-2 concise sentences","confidence":"low|medium|high"}}. Keep pricing realistic for the plan tier and company context. No markdown fences. No prose.';
      
      if (isRealtorLead) {
        systemPrompt = `You are a real estate lead qualification system designer for Una Labs. Given a realtor's intake about their lead management challenges, generate a scope for their AI-powered lead qualification system.

Return ONLY valid JSON with this exact shape:
{"milestones":[
  {"title":"...","description":"...","due_offset_days":7},
  {"title":"...","description":"...","due_offset_days":21},
  {"title":"...","description":"...","due_offset_days":45}
],
"pricing":{"suggested_min_cad":number,"suggested_max_cad":number,"rationale":"1-2 concise sentences","confidence":"low|medium|high"}}

For realtors, focus milestones on:
1. AI voice system setup (incoming lead answering and qualification)
2. Lead scoring and qualification automation (property type, budget, timeline, motivation)
3. Hot/warm/cold lead tagging, CRM integration, and handoff
4. SMS and email follow-up automation

Price based on lead volume: starter ($600), professional ($1200), agency ($2400), enterprise ($4800) CAD/month base.
No markdown fences. No prose. Be specific and actionable.`;
      }

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanSecret(env.OPENAI_API_KEY)}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: JSON.stringify(intakePayload),
            },
          ],
          temperature: 0.4,
          max_tokens: 400,
        }),
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        logEvent('generate_scope_openai_error', {
          projectId,
          status: openaiResponse.status,
          error,
        });
        return;
      }

      const openaiData = (await openaiResponse.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = openaiData.choices?.[0]?.message?.content ?? '';

      // Parse JSON from content (may be wrapped in markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr) as unknown;

      if (Array.isArray(parsed)) {
        // Backward compatibility with previous response shape.
        milestones = parsed as Array<{ title: string; description: string; due_offset_days: number }>;
      } else if (parsed && typeof parsed === 'object') {
        const candidate = parsed as {
          milestones?: Array<{ title?: string; description?: string; due_offset_days?: number }>;
          pricing?: unknown;
        };
        milestones = (candidate.milestones ?? []).map((milestone) => ({
          title: sanitize(String(milestone.title ?? ''), 120),
          description: sanitize(String(milestone.description ?? ''), 280),
          due_offset_days: Number(milestone.due_offset_days ?? 0),
        }));
        priceInsight = normalizePriceInsight(candidate.pricing, intake.plan || activation.tier);
      }

      if (!Array.isArray(milestones) || milestones.length !== 3) {
        logEvent('generate_scope_parse_error', {
          projectId,
          error: 'Expected 3 milestones',
          received: milestones.length,
        });
        return;
      }

      milestones = milestones.map((milestone, index) => ({
        title: sanitize(milestone.title || `Milestone ${index + 1}`, 120),
        description: sanitize(milestone.description || 'Milestone details will be finalized during kickoff.', 280),
        due_offset_days: [7, 21, 45][index],
      }));

      if (!priceInsight) {
        const tier = (intake.plan || activation.tier || '').toLowerCase();
        const bounds = AI_PRICE_BOUNDS[tier] ?? AI_PRICE_BOUNDS.professional;
        priceInsight = {
          suggested_min_cad: bounds.min,
          suggested_max_cad: bounds.max,
          rationale: 'Initial range inferred from selected plan tier and the current intake context. Final estimate is confirmed after kickoff discovery.',
          confidence: 'medium',
        };
      }
    } catch (error) {
      logEvent('generate_scope_openai_exception', {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }
  } else {
    logEvent('generate_scope_env_missing', {
      projectId,
      hasOpenaiKey: Boolean(env.OPENAI_API_KEY),
      hasSupabaseServiceKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      hasMailjetKey: Boolean(env.MAILJET_API_KEY),
    });
    return;
  }

  // Step 2: Write milestones to Supabase
  try {
    const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
    const serviceKey = getSupabaseServiceKey(env);
    const today = new Date();
    const milestonesToWrite = milestones.map((m) => {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + m.due_offset_days);
      return {
        project_id: projectId,
        title: m.title,
        description: m.description,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      };
    });

    const milestonesResponse = await fetch(`${supabaseUrl}/rest/v1/milestones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(milestonesToWrite),
    });

    if (!milestonesResponse.ok) {
      const error = await milestonesResponse.text();
      logEvent('generate_scope_supabase_write_error', {
        projectId,
        status: milestonesResponse.status,
        error,
      });
      return;
    }

    logEvent('generate_scope_milestones_written', {
      projectId,
      count: milestones.length,
    });
  } catch (error) {
    logEvent('generate_scope_supabase_write_exception', {
      projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }

  // Step 3: Update project status to 'scoped'
  try {
    const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
    const serviceKey = getSupabaseServiceKey(env);
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status: 'scoped',
        ai_price_min_cad: priceInsight?.suggested_min_cad ?? null,
        ai_price_max_cad: priceInsight?.suggested_max_cad ?? null,
        ai_price_rationale: priceInsight?.rationale ?? null,
        ai_price_confidence: priceInsight?.confidence ?? null,
        ai_price_generated_at: new Date().toISOString(),
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      logEvent('generate_scope_status_update_error', {
        projectId,
        status: updateResponse.status,
        error,
      });
    }
  } catch (error) {
    logEvent('generate_scope_status_update_exception', {
      projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Step 4: Send kickoff email to client
  try {
    const name = intake.name || activation.email.split('@')[0];
    const firstName = name.split(' ')[0];
    const today = new Date();

    // Fetch project branding (set by admin for white-label/agency use)
    let projectBranding: Branding | null = null;
    try {
      const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
      const serviceKey = getSupabaseServiceKey(env);
      const brandingRes = await fetch(
        `${supabaseUrl}/rest/v1/projects?id=eq.${projectId}&select=branding&limit=1`,
        { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
      );
      if (brandingRes.ok) {
        const [row] = await brandingRes.json() as Array<{ branding?: Branding | null }>;
        projectBranding = row?.branding ?? null;
      }
    } catch { /* non-critical — proceed with defaults */ }

    const brandingColor = projectBranding?.primaryColor ?? '#4DB8A8';
    const brandingName = projectBranding?.companyName ?? 'Una Labs';
    const brandingLogoHtml = projectBranding?.logoUrl
      ? `<img src="${projectBranding.logoUrl}" alt="${brandingName}" style="height:28px;margin-bottom:6px;display:block">`
      : '';
    const brandingTaglineHtml = projectBranding?.tagline
      ? `<p style="color:rgba(255,255,255,0.8);font-size:11px;margin:3px 0 0">${projectBranding.tagline}</p>`
      : '';
    const fromEmail = projectBranding?.replyEmail ?? 'hello@unalabs.cloud';
    const footerLine = projectBranding?.companyName
      ? `Questions? Reply here or email ${fromEmail}<br>${brandingName}`
      : 'Questions? Reply here or email hello@unalabs.cloud<br>Una Labs · unalabs.cloud';

    const milestonesHtml = milestones
      .map((m) => {
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + m.due_offset_days);
        const dateStr = dueDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
        return `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#0B0E11;font-size:14px">${m.title}</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:14px">${dateStr}</td></tr>`;
      })
      .join('');

    const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <div style="background:${brandingColor};border-radius:8px;padding:16px 20px;margin-bottom:24px">
    ${brandingLogoHtml}
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Your project scope is ready</p>
    ${brandingTaglineHtml}
  </div>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:16px">Hi ${firstName},</p>
  <p style="font-size:14px;color:#374151;margin-bottom:20px">We've generated your project scope with 3 milestones. Review them below and let us know if you'd like any adjustments.</p>
  ${priceInsight ? `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px;margin-bottom:20px"><p style="margin:0 0 4px;color:#6B7280;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">AI price insight</p><p style="margin:0;color:#0B0E11;font-size:14px;font-weight:700">CA$${priceInsight.suggested_min_cad.toLocaleString('en-CA')} - CA$${priceInsight.suggested_max_cad.toLocaleString('en-CA')}</p><p style="margin:6px 0 0;color:#374151;font-size:12px">${priceInsight.rationale}</p></div>` : ''}
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr><th style="padding:8px 12px;text-align:left;background:#F9FAFB;color:#6B7280;font-size:13px;font-weight:600;border-bottom:1px solid #E5E7EB">Milestone</th><th style="padding:8px 12px;text-align:left;background:#F9FAFB;color:#6B7280;font-size:13px;font-weight:600;border-bottom:1px solid #E5E7EB">Due Date</th></tr>
    ${milestonesHtml}
  </table>
  <a href="https://unalabs.cloud/login?redirect=/dashboard" style="display:inline-block;background:#F97316;color:white;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px">View in dashboard</a>
  <p style="font-size:12px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px">${footerLine}</p>
</div>`;

    const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: fromEmail, Name: brandingName },
            To: [{ Email: activation.email, Name: name }],
            Subject: `Your project scope is ready — ${brandingName}`,
            HTMLPart: html,
            TextPart: `Hi ${firstName},\n\nYour project scope is ready with 3 milestones.\n${priceInsight ? `\nAI price insight: CA$${priceInsight.suggested_min_cad.toLocaleString('en-CA')} - CA$${priceInsight.suggested_max_cad.toLocaleString('en-CA')} (${priceInsight.confidence} confidence)\n${priceInsight.rationale}\n` : ''}\n${milestones.map((m) => `• ${m.title}`).join('\n')}\n\nView in dashboard: https://unalabs.cloud/login?redirect=/dashboard\n\nQuestions? Reply here or email ${fromEmail}\n\n${brandingName}`,
          },
        ],
      }),
    });

    logEvent('generate_scope_kickoff_email_sent', {
      projectId,
      email: activation.email,
    });
  } catch (error) {
    logEvent('generate_scope_kickoff_email_exception', {
      projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Step 5: Send summary email to Mike
  try {
    const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
    const company = intake.company || 'N/A';

    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:20px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">New scope generated</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Company</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#0B0E11">${company}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Plan</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${activation.tier}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Email</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${activation.email}</td></tr>
    ${priceInsight ? `<tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">AI price insight</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">CA$${priceInsight.suggested_min_cad.toLocaleString('en-CA')} - CA$${priceInsight.suggested_max_cad.toLocaleString('en-CA')} (${priceInsight.confidence})</td></tr>` : ''}
  </table>
  <p style="font-size:13px;color:#6B7280;margin-bottom:12px;font-weight:600">Milestones:</p>
  <ul style="padding-left:20px;margin:0 0 20px;color:#0B0E11;font-size:13px;line-height:1.8">
    ${milestones.map((m) => `<li>${m.title}</li>`).join('')}
  </ul>
  <p style="font-size:12px;color:#9CA3AF">Project ID: ${projectId}</p>
</div>`;

    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: 'mike.fejiro@gmail.com', Name: 'Mike' }],
            Subject: `New scope generated — ${company}`,
            HTMLPart: html,
            TextPart: `New scope generated\n\nCompany: ${company}\nPlan: ${activation.tier}\nEmail: ${activation.email}${priceInsight ? `\nAI price insight: CA$${priceInsight.suggested_min_cad.toLocaleString('en-CA')} - CA$${priceInsight.suggested_max_cad.toLocaleString('en-CA')} (${priceInsight.confidence})\nRationale: ${priceInsight.rationale}` : ''}\n\nMilestones:\n${milestones.map((m) => `• ${m.title}`).join('\n')}\n\nProject ID: ${projectId}`,
          },
        ],
      }),
    });

    logEvent('generate_scope_mike_email_sent', {
      projectId,
      company,
    });
  } catch (error) {
    logEvent('generate_scope_mike_email_exception', {
      projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Phase 15: fire proposal.sent webhook (best-effort)
  void fireWebhooks(env, projectId, 'proposal.sent', {
    project_id: projectId,
    email: activation.email,
    milestones: milestones.map((m) => m.title),
  });
}

async function resolveActivation(
  stripe: Stripe,
  sessionId: string,
  intake: Record<string, string>
): Promise<{ activation: ActivationPayload; alreadyActivated: boolean; subscriptionId: string }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (
    session.payment_status !== 'paid'
    && session.payment_status !== 'no_payment_required'
    && session.status !== 'complete'
  ) {
    throw new Error(`Checkout session ${sessionId} is not complete.`);
  }

  const email = session.customer_email ?? sanitize(session.metadata?.email) ?? intake.email ?? '';
  const tier = session.metadata?.tier ?? intake.activationBand ?? intake.plan ?? '';
  const billing = session.metadata?.billing ?? intake.billing ?? '';
  const checkoutType = normalizeCheckoutType(
    sanitize(session.metadata?.checkout_type) || sanitize(intake.checkoutType),
  );
  const serviceType = sanitize(session.metadata?.service_type) || sanitize(intake.serviceType) || 'custom_project_activation';
  const amountCad = Number(
    sanitize(session.metadata?.amount_cad) ||
      sanitize(intake.activationFee) ||
      (isActivationTier(tier) ? ACTIVATION_TIER_PRICES[tier] : 0),
  ) || 0;
  const founderOverride =
    sanitize(session.metadata?.founder_override).toLowerCase() === 'true' ||
    sanitize(intake.founderOverride).toLowerCase() === 'true';
  const creditTowardBuild =
    sanitize(session.metadata?.credit_toward_build).toLowerCase() === 'true' ||
    sanitize(intake.creditTowardBuild).toLowerCase() === 'true';
  const intakeId = session.metadata?.intake_id ?? intake.intakeId ?? '';
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? '';

  let alreadyActivated = false;
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    alreadyActivated = subscription.metadata.una_activation_status === 'active';
  }

  return {
    activation: {
      intake_id: intakeId,
      email,
      tier,
      billing,
      checkout_type: checkoutType,
      service_type: serviceType,
      amount_cad: amountCad,
      founder_override: founderOverride,
      credit_toward_build: creditTowardBuild,
      payment_status: 'active',
      session_id: sessionId,
      created_at: new Date().toISOString(),
      intake,
    },
    alreadyActivated,
    subscriptionId,
  };
}

async function markSubscriptionActivated(
  stripe: Stripe,
  subscriptionId: string,
  activation: ActivationPayload,
  duplicateActivation: boolean
): Promise<void> {
  if (!subscriptionId) return;

  await stripe.subscriptions.update(subscriptionId, {
    metadata: {
      una_activation_status: 'active',
      una_activation_session_id: activation.session_id,
      una_activation_at: activation.created_at,
      una_activation_duplicate: duplicateActivation ? 'true' : 'false',
    },
  });
}

async function runActivation(
  env: Env,
  stripe: Stripe,
  sessionId: string,
  intake: Record<string, string>
): Promise<ActivationRunResult> {
  const { activation, alreadyActivated, subscriptionId } = await resolveActivation(stripe, sessionId, intake);

  logEvent('activate_project_verified', {
    sessionId,
    email: activation.email,
    tier: activation.tier,
    billing: activation.billing,
    alreadyActivated,
    hasSupabaseUrl: Boolean(env.SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(env.SUPABASE_ANON_KEY),
    hasMailjetKey: Boolean(env.MAILJET_API_KEY),
    hasMailjetSecret: Boolean(env.MAILJET_SECRET_KEY),
  });

  if (alreadyActivated) {
    return {
      activation,
      alreadyActivated: true,
      projectWrite: { attempted: false, inserted: false, duplicate: true, status: 200 },
      projectWebhook: { attempted: false, delivered: false, status: 0 },
      emailWebhook: { attempted: false, delivered: false, status: 0 },
    };
  }

  const projectWrite = await writeProjectToSupabase(env, activation, intake);
  logEvent('activate_project_supabase_write', {
    sessionId,
    inserted: projectWrite.inserted,
    duplicate: projectWrite.duplicate,
    projectId: projectWrite.projectId,
    status: projectWrite.status,
    error: projectWrite.error,
  });

  if (!projectWrite.inserted && !projectWrite.duplicate) {
    throw new Error(`Supabase project write failed: ${projectWrite.error ?? projectWrite.status}`);
  }

  const duplicateActivation = projectWrite.duplicate;
  await markSubscriptionActivated(stripe, subscriptionId, activation, duplicateActivation);

  if (duplicateActivation) {
    logEvent('activate_project_duplicate', {
      sessionId,
      email: activation.email,
    });

    return {
      activation,
      alreadyActivated: true,
      projectWrite,
      projectWebhook: { attempted: false, delivered: false, status: 0 },
      emailWebhook: { attempted: false, delivered: false, status: 0 },
    };
  }

  // Phase 15: fire project.created webhook (best-effort)
  if (projectWrite.projectId && projectWrite.inserted) {
    void fireWebhooks(env, projectWrite.projectId, 'project.created', {
      email: activation.email,
      tier: activation.tier,
    });
  }

  // Generate and write project scope
  if (projectWrite.projectId) {
    try {
      await generateAndWriteScopeDraft(projectWrite.projectId, intake, activation, env);
    } catch (error) {
      logEvent('generate_scope_error', {
        sessionId,
        projectId: projectWrite.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const projectWebhook = shouldDeliverBridgeWebhook(env)
    ? await deliverWebhook(
        env.UNALABS_NEW_PROJECT_WEBHOOK_URL,
        {
          'content-type': 'application/json',
          'x-unalabs-source': 'stripe-api-worker',
          'authorization': env.ATEAM_KEY ? `Bearer ${cleanSecret(env.ATEAM_KEY)}` : '',
        },
        { type: 'una_new_subscription', activation, intake }
      )
    : { attempted: false, delivered: false, status: 0 };

  const emailWebhook = await deliverWebhook(
    env.UNALABS_PROJECT_CONFIRMATION_EMAIL_WEBHOOK_URL,
    { 'content-type': 'application/json', 'x-unalabs-source': 'stripe-api-worker' },
    { type: 'una_subscription_confirmation', email: activation.email, tier: activation.tier, billing: activation.billing, session_id: activation.session_id }
  );

  logEvent('activate_project_delivery', {
    sessionId,
    projectWebhook,
    emailWebhook,
  });

  try { await sendIntakeNotification(env, activation, intake); } catch (error) {
    logEvent('activate_project_internal_email_error', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown internal email error.',
    });
  }

  try { await sendCustomerWelcome(env, activation, intake.name); } catch (error) {
    logEvent('activate_project_customer_email_error', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown customer email error.',
    });
  }

  return {
    activation,
    alreadyActivated: false,
    projectWrite,
    projectWebhook,
    emailWebhook,
  };
}

async function handleStripeWebhook(req: Request, env: Env, origin: string | null): Promise<Response> {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return json({ error: 'Missing stripe-signature header.' }, 400, origin);
  }

  const rawBody = await req.text();
  const stripe = getStripe(env);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logEvent('stripe_webhook_signature_failed', {
      error: err instanceof Error ? err.message : 'Signature verification failed.',
    });
    return json({ error: 'Webhook signature verification failed.' }, 400, origin);
  }

  logEvent('stripe_webhook_received', { type: event.type, id: event.id });

  try {
    const jobAgentEvent = await normalizeJobAgentStripeEvent(stripe, event);
    if (jobAgentEvent) {
      await forwardJobAgentStripeEvent(env, jobAgentEvent);
      logEvent('jobagent_stripe_event_delivered', {
        stripeEventId: event.id,
        type: event.type,
        userId: jobAgentEvent.userId,
      });
      return json({ received: true, service: 'jobagent' }, 200, origin);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid' || session.status === 'complete') {
        await runActivation(env, stripe, session.id, {});
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const stripeInvoice = event.data.object as Stripe.Invoice;
      logEvent('stripe_invoice_payment_succeeded', {
        stripeInvoiceId: stripeInvoice.id,
        customerEmail: stripeInvoice.customer_email ?? '',
        amountPaid: stripeInvoice.amount_paid,
      });
      // Reconciliation failures are caught here so Stripe does not receive a non-200 and retry
      // the webhook. The error is logged for observability.
      await reconcileAutoCollectPaidByStripeInvoice(env, stripeInvoice).catch((err) => {
        logEvent('stripe_webhook_invoice_reconcile_error', {
          stripeInvoiceId: stripeInvoice.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
    }
  } catch (err) {
    logEvent('stripe_webhook_handler_error', {
      type: event.type,
      id: event.id,
      error: err instanceof Error ? err.message : 'Unknown handler error.',
    });
    return json({ error: 'Webhook handler error.' }, 500, origin);
  }

  return json({ received: true }, 200, origin);
}

async function reconcileAutoCollectPaidByStripeInvoice(env: Env, stripeInvoice: Stripe.Invoice): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;

  const supabaseUrl = cleanSecret(env.SUPABASE_URL);
  const serviceKey = getSupabaseServiceKey(env);

  // Stripe subscription invoices carry a subscription ID in metadata or on the invoice itself.
  // Look up autocollect items that reference the same invoice number or metadata.
  const stripeInvoiceNumber = stripeInvoice.number ?? '';
  if (!stripeInvoiceNumber) return;

  // Find the matching Supabase invoice by invoice_number derived from Stripe invoice number.
  const res = await fetch(
    `${supabaseUrl}/rest/v1/invoices?invoice_number=eq.${encodeURIComponent(stripeInvoiceNumber)}&select=id,status`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    },
  );
  if (!res.ok) return;

  const rows = await res.json() as Array<{ id: string; status?: string }>;
  const unpaid = rows.filter((r) => !['paid', 'void'].includes((r.status ?? '').toLowerCase()));
  if (!unpaid.length) return;

  const ids = unpaid.map((r) => r.id);
  await markAutoCollectItemsPaidByIds(env, ids, 'stripe_invoice_payment_succeeded');
}

async function handleActivateProject(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const sessionId = sanitize(body.session_id);
  const intake = sanitizeIntake(body.intake);
  if (!sessionId) {
    return json({ error: 'session_id is required.' }, 400, origin);
  }

  try {
    const stripe = getStripe(env);
    const result = await runActivation(env, stripe, sessionId, intake);
    return json({
      ok: true,
      activation: result.activation,
      already_activated: result.alreadyActivated,
      project_write: result.projectWrite,
      project_webhook: result.projectWebhook,
      email_webhook: result.emailWebhook,
    }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not verify payment.';
    logEvent('activate_project_error', {
      sessionId,
      message,
    });
    return json({ error: 'Could not verify payment.' }, 500, origin);
  }
}

async function handleCheckoutSuccess(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = sanitize(url.searchParams.get('session_id'));
  const siteUrl = getSiteUrl(env);

  if (!sessionId) {
    return redirect(`${siteUrl}/confirmation?activation=error`);
  }

  try {
    const stripe = getStripe(env);
    const result = await runActivation(env, stripe, sessionId, {});
    const redirectUrl = new URL('/confirmation', siteUrl);
    redirectUrl.searchParams.set('session_id', sessionId);
    redirectUrl.searchParams.set('activation', result.alreadyActivated ? 'already_active' : 'success');
    redirectUrl.searchParams.set('plan', result.activation.tier || 'professional');
    redirectUrl.searchParams.set('checkout_type', normalizeCheckoutType(result.activation.checkout_type));
    if (result.activation.email) {
      redirectUrl.searchParams.set('email', result.activation.email.toLowerCase());
    }
    return redirect(redirectUrl.toString());
  } catch (error) {
    logEvent('checkout_success_redirect_error', {
      sessionId,
      message: error instanceof Error ? error.message : 'Unknown checkout success error.',
    });
    return redirect(`${siteUrl}/confirmation?session_id=${encodeURIComponent(sessionId)}&activation=error`);
  }
}

async function handleMilestoneAction(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) {
    return json({ ok: true }, 200, origin); // non-fatal if email not configured
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Invalid body.' }, 400, origin); }

  const milestoneTitle = sanitize(body.milestone_title);
  const projectTitle = sanitize(body.project_title);
  const action = sanitize(body.action); // 'approve' | 'changes'
  const clientEmail = sanitize(body.client_email);
  const notes = sanitize(body.notes ?? '');
  const milestoneProjectId = sanitize(body.project_id ?? '');

  const isApprove = action === 'approve';
  const subject = isApprove
    ? `✓ Approved: "${milestoneTitle}" — ${clientEmail}`
    : `⚠ Changes requested: "${milestoneTitle}" — ${clientEmail}`;

  const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <div style="background:${isApprove ? '#4DB8A8' : '#F97316'};border-radius:8px;padding:16px 20px;margin-bottom:20px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">${isApprove ? '✓ Milestone Approved' : '⚠ Changes Requested'}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Client</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#0B0E11">${clientEmail}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Milestone</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${milestoneTitle}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Project</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${projectTitle}</td></tr>
  </table>
  ${notes ? `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:12px 16px;margin-bottom:16px"><p style="font-size:13px;color:#92400E;margin:0 0 4px;font-weight:600">Client notes</p><p style="font-size:14px;color:#0B0E11;margin:0">${notes}</p></div>` : ''}
  <p style="font-size:12px;color:#9CA3AF">Una Labs client portal · unalabs.cloud</p>
</div>`;

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
  try {
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({
        Messages: [{
          From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
          ReplyTo: { Email: clientEmail, Name: clientEmail },
          To: [{ Email: 'mike.fejiro@gmail.com', Name: 'Mike' }],
          Subject: subject,
          HTMLPart: html,
          TextPart: `${subject}\n\nClient: ${clientEmail}\nMilestone: ${milestoneTitle}\nProject: ${projectTitle}${notes ? `\n\nNotes: ${notes}` : ''}`,
        }],
      }),
    });
  } catch { /* non-fatal */ }

  // Phase 15: fire milestone.approved webhook (best-effort, only when project_id provided)
  if (isApprove && milestoneProjectId) {
    void fireWebhooks(env, milestoneProjectId, 'milestone.approved', {
      milestone_title: milestoneTitle,
      project_title: projectTitle,
      client_email: clientEmail,
    });
  }

  return json({ ok: true }, 200, origin);
}

async function handleSubscribe(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) {
    return json({ error: 'Email service not configured.' }, 500, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const email = sanitize(body.email);
  if (!email || !email.includes('@')) {
    return json({ error: 'A valid email is required.' }, 400, origin);
  }

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);

  const mailjetResponse = await fetch('https://api.mailjet.com/v3/REST/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({ Email: email, IsExcludedFromCampaigns: false }),
  });

  const alreadySubscribed = mailjetResponse.status === 400;
  if (!mailjetResponse.ok && !alreadySubscribed) {
    return json({ error: 'Could not save subscription.' }, 500, origin);
  }

  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    try {
      await fetch(`${cleanSecret(env.SUPABASE_URL)}/rest/v1/subscribers?on_conflict=email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cleanSecret(env.SUPABASE_ANON_KEY),
          'Authorization': `Bearer ${cleanSecret(env.SUPABASE_ANON_KEY)}`,
          'Prefer': 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Non-fatal. Mailjet is still the primary source of truth for the list add.
    }
  }

  if (!alreadySubscribed) {
    try {
      const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Una Labs</p>
  </div>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:16px">You're in the loop.</p>
  <p style="font-size:14px;color:#374151;margin-bottom:24px">We'll send you product updates, delivery insights, and professional service tips — no noise, no spam.</p>
  <a href="https://unalabs.cloud" style="display:inline-block;background:#F97316;color:white;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">Visit Una Labs</a>
  <p style="font-size:12px;color:#9CA3AF;margin-top:24px;border-top:1px solid #E5E7EB;padding-top:16px">Una Labs · unalabs.cloud</p>
</div>`;

      await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
        body: JSON.stringify({
          Messages: [{
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: email }],
            Subject: 'You\'re subscribed to Una Labs',
            HTMLPart: html,
            TextPart: `You're in the loop.\n\nWe'll send you product updates, delivery insights, and professional service tips — no noise, no spam.\n\nUna Labs · unalabs.cloud`,
          }],
        }),
      });
    } catch {
      // Non-fatal. The contact add already succeeded.
    }
  }

  return json({ ok: true, already_subscribed: alreadySubscribed }, 200, origin);
}

async function handleIntakeConfirm(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) return json({ ok: true }, 200, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Invalid body.' }, 400, origin); }

  const email = sanitize(body.email);
  const name = sanitize(body.name) || email.split('@')[0];
  const plan = sanitize(body.plan || body.tier) || 'professional';
  const billing = sanitize(body.billing) || 'monthly';
  const checkoutType = normalizeCheckoutType(body.checkout_type);
  const amountCad = Number(body.amount_cad);

  if (checkoutType === 'activation') {
    const offerLabel = getTierLabel(plan);
    const chargedToday = Number.isFinite(amountCad)
      ? amountCad
      : ACTIVATION_TIER_PRICES[plan as keyof typeof ACTIVATION_TIER_PRICES] ?? 0;
    const creditLine = body.credit_toward_build
      ? 'If you proceed to build, this activation fee is credited toward your first build payment.'
      : 'Build deposit is handled separately after scope approval.';
    const firstName = name.split(' ')[0];
    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Una Labs</p>
  </div>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:8px">Hi ${firstName},</p>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:20px">We've received your intake. You're one step away from activating your <strong>${offerLabel}</strong>.</p>
  <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin-bottom:24px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Service</td><td style="font-size:13px;font-weight:600;color:#0B0E11">${offerLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Charged today</td><td style="font-size:13px;font-weight:700;color:#0B0E11">CA$${chargedToday}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Next step</td><td style="font-size:13px;color:#0B0E11">Scope pack first, build deposit after approval</td></tr>
    </table>
  </div>
  <p style="font-size:13px;color:#6B7280;margin-bottom:20px">${creditLine}</p>
  <p style="font-size:12px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px">Questions? Reply to this email or reach us at <a href="mailto:hello@unalabs.cloud" style="color:#4DB8A8">hello@unalabs.cloud</a><br>Una Labs | unalabs.cloud</p>
</div>`;
    const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
    try {
      await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
        body: JSON.stringify({
          Messages: [{
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: email, Name: name }],
            Subject: `Your Una Labs ${offerLabel} intake is confirmed`,
            HTMLPart: html,
            TextPart: `Hi ${firstName},\n\nWe've received your intake. You're one step away from activating your ${offerLabel}.\n\nService: ${offerLabel}\nCharged today: CA$${chargedToday}\nNext step: Scope pack first, build deposit after approval\n\n${creditLine}\n\nQuestions? Email hello@unalabs.cloud\n\nUna Labs | unalabs.cloud`,
          }],
        }),
      });
    } catch { /* non-fatal */ }

    return json({ ok: true }, 200, origin);
  }

  const planLabels: Record<string, string> = { starter: 'Starter', professional: 'Professional', agency: 'Agency', enterprise: 'Enterprise' };
  const planLabel = planLabels[plan] ?? plan;
  const billingLabel = billing === 'annual' ? 'Annual billing' : 'Monthly billing';
  const firstName = name.split(' ')[0];

  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Una Labs</p>
  </div>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:8px">Hi ${firstName},</p>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:20px">We've received your intake. You're one step away from starting your <strong>${planLabel}</strong> trial.</p>
  <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin-bottom:24px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Plan</td><td style="font-size:13px;font-weight:600;color:#0B0E11">${planLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Billing</td><td style="font-size:13px;color:#0B0E11">${billingLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px">Due today</td><td style="font-size:13px;font-weight:700;color:#4DB8A8">CA$0 — 14-day free trial</td></tr>
    </table>
  </div>
  <p style="font-size:13px;color:#6B7280;margin-bottom:20px">Check your inbox after checkout — we'll send your trial confirmation and next steps.</p>
  <p style="font-size:12px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px">Questions? Reply to this email or reach us at <a href="mailto:hello@unalabs.cloud" style="color:#4DB8A8">hello@unalabs.cloud</a><br>Una Labs · unalabs.cloud</p>
</div>`;

  const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
  try {
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({
        Messages: [{
          From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
          To: [{ Email: email, Name: name }],
          Subject: `Your Una Labs ${planLabel} intake is confirmed`,
          HTMLPart: html,
          TextPart: `Hi ${firstName},\n\nWe've received your intake. You're one step away from your ${planLabel} trial.\n\nPlan: ${planLabel}\nBilling: ${billingLabel}\nDue today: CA$0 (14-day free trial)\n\nCheck your inbox after checkout — we'll send your trial confirmation and next steps.\n\nQuestions? Email hello@unalabs.cloud\n\nUna Labs · unalabs.cloud`,
        }],
      }),
    });
  } catch { /* non-fatal */ }

  return json({ ok: true }, 200, origin);
}

async function handleEnsureContract(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyUser(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const projectId = sanitize(body.project_id, 80);
  if (!projectId) return json({ error: 'project_id is required.' }, 400, origin);

  try {
    const result = await ensureContractForProject(env, projectId, auth.user.email);
    return json({
      ok: true,
      project: result.project,
      milestones: result.milestones,
      contract: result.contract,
    }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to prepare contract.';
    const status = message === 'Forbidden.' ? 403 : message === 'Project not found.' ? 404 : 500;
    return json({ error: message }, status, origin);
  }
}

async function handleSignContract(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyUser(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const projectId = sanitize(body.project_id, 80);
  const signerName = sanitize(body.signer_name, 120);
  const accepted = body.accepted === true;
  if (!projectId) return json({ error: 'project_id is required.' }, 400, origin);
  if (!signerName) return json({ error: 'signer_name is required.' }, 400, origin);
  if (!accepted) return json({ error: 'You must accept the engagement letter.' }, 400, origin);

  try {
    const ensured = await ensureContractForProject(env, projectId, auth.user.email);
    if (ensured.contract.status === 'signed') {
      return json({ ok: true, project: ensured.project, contract: ensured.contract }, 200, origin);
    }

    const serviceKey = getSupabaseServiceKey(env);
    const now = new Date().toISOString();
    const signedIp = sanitize(req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '', 120);
    const signedUserAgent = sanitize(req.headers.get('user-agent') || '', 500);
    const response = await fetch(`${cleanSecret(env.SUPABASE_URL!)}/rest/v1/contracts?id=eq.${encodeURIComponent(ensured.contract.id)}&select=*`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        status: 'signed',
        signer_name: signerName,
        signer_email: auth.user.email,
        signature_text: signerName,
        signed_at: now,
        signed_ip: signedIp || null,
        signed_user_agent: signedUserAgent || null,
        updated_at: now,
      }),
    });
    if (!response.ok) throw new Error(`Contract sign failed: ${response.status}`);
    const rows = await response.json() as ContractRecord[];
    const contract = rows[0];

    try {
      await sendContractSignedNotifications(env, ensured.project, contract);
    } catch (error) {
      logEvent('contract_signed_email_error', {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown contract email error.',
      });
    }

    return json({ ok: true, project: ensured.project, contract }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sign contract.';
    const status = message === 'Forbidden.' ? 403 : message === 'Project not found.' ? 404 : 500;
    return json({ error: message }, status, origin);
  }
}

async function handleGenerateInvoice(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyUser(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status ?? 401, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body.' }, 400, origin);
  }

  const milestoneId = sanitize(body.milestone_id as string | undefined, 80);
  if (!milestoneId) return json({ error: 'milestone_id required.' }, 400, origin);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const milestoneRes = await fetch(`${supabaseUrl}/rest/v1/milestones?id=eq.${encodeURIComponent(milestoneId)}&select=id,project_id,title`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
  });
  if (!milestoneRes.ok) return json({ error: 'Failed to fetch milestone.' }, 502, origin);
  const milestones = await milestoneRes.json() as InvoiceMilestone[];
  if (!milestones.length) return json({ error: 'Milestone not found.' }, 404, origin);
  const milestone = milestones[0];

  const projectRes = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(milestone.project_id)}&select=id,email,name,tier,billing,status,created_at`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
  });
  if (!projectRes.ok) return json({ error: 'Failed to fetch project.' }, 502, origin);
  const projects = await projectRes.json() as ContractProject[];
  if (!projects.length) return json({ error: 'Project not found.' }, 404, origin);
  const project = projects[0];

  if (project.email.toLowerCase() !== auth.user.email.toLowerCase() && auth.user.email !== ADMIN_EMAIL) {
    return json({ error: 'Forbidden.' }, 403, origin);
  }

  const existingRes = await fetch(`${supabaseUrl}/rest/v1/invoices?milestone_id=eq.${encodeURIComponent(milestoneId)}&select=*`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
  });
  if (!existingRes.ok) return json({ error: 'Failed to check existing invoice.' }, 502, origin);
  const existing = await existingRes.json() as InvoiceRecord[];
  if (existing.length) {
    return json({ ok: true, invoice: existing[0] }, 200, origin);
  }

  const countRes = await fetch(`${supabaseUrl}/rest/v1/invoices?select=id`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'count=exact',
    },
  });

  let total = 0;
  const range = countRes.headers.get('content-range');
  if (range?.includes('/')) {
    const parsed = Number(range.split('/')[1]);
    if (!Number.isNaN(parsed)) total = parsed;
  }

  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${String(total + 1).padStart(3, '0')}`;
  const amountCad = INVOICE_TIER_PRICE[project.tier?.toLowerCase() ?? ''] ?? 0;
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const title = `Invoice for: ${sanitize(milestone.title || 'Milestone', 160)}`;

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/invoices`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      project_id: project.id,
      milestone_id: milestoneId,
      invoice_number: invoiceNumber,
      title,
      amount_cad: amountCad,
      status: 'unpaid',
      due_date: dueDate,
      client_email: project.email,
    }),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    return json({ error: `Failed to insert invoice: ${errText}` }, 502, origin);
  }

  const inserted = await insertRes.json() as InvoiceRecord[];
  const invoice = inserted[0];

  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) {
    const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
    const siteUrl = getSiteUrl(env);
    const invoiceLink = `${siteUrl}/dashboard/invoice?milestone_id=${encodeURIComponent(milestoneId)}`;
    const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Invoice generated</p>
  </div>
  <p style="font-size:14px;color:#111827">Hi ${sanitize(project.name || project.email, 120)}, an invoice has been generated for your approved milestone.</p>
  <table style="width:100%;border-collapse:collapse;margin:14px 0 20px">
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Invoice #</td><td style="padding:6px 0;font-size:13px;color:#0B0E11;font-weight:600">${invoiceNumber}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Milestone</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${sanitize(milestone.title || 'Milestone', 120)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Amount</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">CA$${amountCad.toLocaleString('en-CA')}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Due date</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${dueDate}</td></tr>
  </table>
  <p><a href="${invoiceLink}" style="display:inline-block;padding:10px 16px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View invoice</a></p>
</div>`;

    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: project.email, Name: sanitize(project.name || project.email, 120) }],
            Subject: `Invoice ${invoiceNumber} - CA$${amountCad} due ${dueDate}`,
            HTMLPart: html,
            TextPart: `Invoice ${invoiceNumber}\nMilestone: ${milestone.title || 'Milestone'}\nAmount: CA$${amountCad}\nDue: ${dueDate}\nView: ${invoiceLink}`,
          },
          {
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: ADMIN_EMAIL, Name: 'Mike' }],
            Subject: `[Admin] Invoice ${invoiceNumber} generated for ${project.email}`,
            HTMLPart: html,
            TextPart: `Invoice ${invoiceNumber} generated.\nClient: ${project.email}\nMilestone: ${milestone.title || 'Milestone'}\nAmount: CA$${amountCad}\nDue: ${dueDate}`,
          },
        ],
      }),
    }).catch(() => {
      // non-fatal
    });
  }

  return json({ ok: true, invoice }, 200, origin);
}

async function handleGetInvoices(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyUser(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status ?? 401, origin);

  const url = new URL(req.url);
  const milestoneId = sanitize(url.searchParams.get('milestone_id') ?? '', 80);
  const projectId = sanitize(url.searchParams.get('project_id') ?? '', 80);

  if (!milestoneId && !projectId) {
    return json({ error: 'milestone_id or project_id required.' }, 400, origin);
  }

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const filter = milestoneId
    ? `milestone_id=eq.${encodeURIComponent(milestoneId)}`
    : `project_id=eq.${encodeURIComponent(projectId)}`;

  const response = await fetch(`${supabaseUrl}/rest/v1/invoices?${filter}&select=*&order=created_at.desc`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok) return json({ error: 'Failed to fetch invoices.' }, 502, origin);
  const invoices = await response.json() as InvoiceRecord[];

  const filtered = auth.user.email === ADMIN_EMAIL
    ? invoices
    : invoices.filter((invoice) => invoice.client_email.toLowerCase() === auth.user.email.toLowerCase());

  return json({ ok: true, invoices: filtered }, 200, origin);
}

// ── Admin: Billing Status ─────────────────────────────────────────────
async function handleAdminBilling(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  const body = await req.json() as { stripe_session_ids?: string[] };
  const sessionIds = body.stripe_session_ids;
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return json({ error: 'stripe_session_ids required.' }, 400, origin);
  }

  // Cap at 50 to prevent abuse
  const ids = sessionIds.slice(0, 50).filter((id) => typeof id === 'string' && id.startsWith('cs_'));
  const stripe = getStripe(env);

  const results: Record<string, {
    subscription_id: string | null;
    status: string;
    current_period_end: number | null;
    cancel_at_period_end: boolean;
    pause_collection: boolean;
    trial_end: number | null;
  }> = {};

  await Promise.all(ids.map(async (sessionId) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (!subId) {
        results[sessionId] = { subscription_id: null, status: 'no_subscription', current_period_end: null, cancel_at_period_end: false, pause_collection: false, trial_end: null };
        return;
      }
      const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items.data'] });
      const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null;
      results[sessionId] = {
        subscription_id: sub.id,
        status: sub.status,
        current_period_end: periodEnd,
        cancel_at_period_end: sub.cancel_at_period_end,
        pause_collection: sub.pause_collection !== null,
        trial_end: sub.trial_end,
      };
    } catch {
      results[sessionId] = { subscription_id: null, status: 'error', current_period_end: null, cancel_at_period_end: false, pause_collection: false, trial_end: null };
    }
  }));

  return json({ billing: results }, 200, origin);
}

// ── Admin: Subscription Action ────────────────────────────────────────
async function handleAdminSubscriptionAction(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  const body = await req.json() as { subscription_id?: string; action?: string };
  const { subscription_id, action } = body;
  if (!subscription_id || typeof subscription_id !== 'string' || !subscription_id.startsWith('sub_')) {
    return json({ error: 'Valid subscription_id required.' }, 400, origin);
  }
  if (!action || !['pause', 'resume', 'cancel'].includes(action)) {
    return json({ error: 'Action must be pause, resume, or cancel.' }, 400, origin);
  }

  const stripe = getStripe(env);

  try {
    let sub: Stripe.Subscription;
    switch (action) {
      case 'pause':
        sub = await stripe.subscriptions.update(subscription_id, {
          pause_collection: { behavior: 'mark_uncollectible' },
        });
        break;
      case 'resume':
        sub = await stripe.subscriptions.update(subscription_id, {
          pause_collection: '',
        } as Stripe.SubscriptionUpdateParams);
        break;
      case 'cancel':
        sub = await stripe.subscriptions.update(subscription_id, {
          cancel_at_period_end: true,
        });
        break;
      default:
        return json({ error: 'Unknown action.' }, 400, origin);
    }

    const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null;
    return json({
      ok: true,
      subscription: {
        id: sub.id,
        status: sub.status,
        current_period_end: periodEnd,
        cancel_at_period_end: sub.cancel_at_period_end,
        pause_collection: sub.pause_collection !== null,
        trial_end: sub.trial_end,
      },
    }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    return json({ error: message }, 500, origin);
  }
}

async function handleAdminInstantBill(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body.' }, 400, origin);
  }

  const projectId = sanitize(body.project_id, 80);
  const description = sanitize(body.description, 180);
  const amountRaw = Number(body.amount_cad);
  const amountCad = Number.isFinite(amountRaw) ? Number(amountRaw.toFixed(2)) : 0;
  const minAmountCad = 0.5;

  if (!projectId) return json({ error: 'project_id required.' }, 400, origin);
  if (!description) return json({ error: 'description required.' }, 400, origin);
  if (amountCad < minAmountCad || amountCad > 50000) {
    return json({ error: 'amount_cad must be between 0.50 and 50000.' }, 400, origin);
  }

  const serviceKey = getSupabaseServiceKey(env);
  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);

  const projectRes = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id,email,name`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!projectRes.ok) return json({ error: 'Project lookup failed.' }, 502, origin);
  const projects = await projectRes.json() as ContractProject[];
  const project = projects[0];
  if (!project) return json({ error: 'Project not found.' }, 404, origin);

  const stripe = getStripe(env);
  const amountCents = Math.round(amountCad * 100);
  const amountCadLabel = amountCad.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const projectLabel = sanitize(project.name || project.email, 120);
  const instantBillItemName = sanitize(
    description ? `Instant Bill - ${description}` : `Instant Bill - ${projectLabel}`,
    120,
  );

  let product: Stripe.Product;
  let price: Stripe.Price;
  let paymentLink: Stripe.PaymentLink;

  try {
    product = await stripe.products.create({
      name: instantBillItemName,
      description,
      metadata: {
        project_id: project.id,
        type: 'instant_bill',
      },
    });

    price = await stripe.prices.create({
      currency: 'cad',
      unit_amount: amountCents,
      product: product.id,
      metadata: {
        project_id: project.id,
        type: 'instant_bill',
      },
    });

    paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      automatic_tax: { enabled: false },
      metadata: {
        project_id: project.id,
        type: 'instant_bill',
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Stripe instant bill creation failed.' }, 500, origin);
  }

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/instant_bills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      project_id: project.id,
      stripe_payment_link_id: paymentLink.id,
      stripe_price_id: price.id,
      amount_cad: amountCad,
      description,
      payment_link_url: paymentLink.url,
      status: 'sent',
    }),
  });
  if (!insertRes.ok) {
    const message = await insertRes.text();
    return json({ error: `Failed to persist instant bill: ${message}` }, 502, origin);
  }
  const createdRows = await insertRes.json() as InstantBillRecord[];
  const instantBill = createdRows[0];

  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) {
    const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
    const subject = `Instant bill - CA$${amountCadLabel} - ${projectLabel}`;
    const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#F97316;border-radius:8px;padding:16px 20px;margin-bottom:20px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Instant payment link</p>
  </div>
  <p style="font-size:14px;color:#111827">Hi ${projectLabel},</p>
  <p style="font-size:14px;color:#111827">A one-off payment link has been created for this request: ${description}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0 20px">
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Amount</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">CA$${amountCadLabel}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Project</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${projectLabel}</td></tr>
  </table>
  <p><a href="${paymentLink.url}" style="display:inline-block;padding:10px 16px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Pay now</a></p>
</div>`;

    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: project.email, Name: projectLabel }],
            Subject: subject,
            HTMLPart: html,
            TextPart: `${subject}\n\nDescription: ${description}\nAmount: CA$${amountCadLabel}\nProject: ${projectLabel}\nPay: ${paymentLink.url}`,
          },
          {
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: ADMIN_EMAIL, Name: 'Mike' }],
            Subject: `[Admin] ${subject}`,
            HTMLPart: html,
            TextPart: `[Admin] ${subject}\n\nClient: ${project.email}\nDescription: ${description}\nAmount: CA$${amountCadLabel}\nProject: ${projectLabel}\nPay link: ${paymentLink.url}`,
          },
        ],
      }),
    }).catch(() => {
      // Non-fatal.
    });
  }

  return json({ ok: true, instant_bill: instantBill, payment_link_url: paymentLink.url }, 200, origin);
}

async function handleAdminIntakeDraft(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body.' }, 400, origin);
  }

  const email = sanitize(body.email, 160).toLowerCase();
  const name = sanitize(body.name, 120);
  const company = sanitize(body.company, 120);
  const role = sanitize(body.role, 120);
  const projectTitle = sanitize(body.project_title, 140);
  const transcript = sanitize(body.transcript, 4000);
  const activationBand = normalizeActivationBand(sanitize(body.activation_band_override || body.activation_band, 80));

  if (!email || !email.includes('@')) return json({ error: 'Valid client email required.' }, 400, origin);
  if (!projectTitle && !transcript) return json({ error: 'Project title or intake transcript is required.' }, 400, origin);

  const intake: Record<string, string> = {
    email,
    name,
    company,
    role,
    projectTitle: projectTitle || name || company || 'Custom project',
    projectSummary: transcript,
    transcript,
    activationBand,
    plan: activationBand,
    billing: 'one_time',
    intakeId: `manual_${Date.now()}`,
  };

  const activation: ActivationPayload = {
    intake_id: intake.intakeId,
    email,
    tier: activationBand,
    billing: 'one_time',
    checkout_type: 'activation',
    service_type: 'custom_project_activation',
    amount_cad: ACTIVATION_TIER_PRICES[activationBand as keyof typeof ACTIVATION_TIER_PRICES] ?? 0,
    founder_override: activationBand === 'founding_pilot_activation',
    credit_toward_build: activationBand === 'founding_pilot_activation',
    payment_status: 'active',
    session_id: `manual_${Date.now()}`,
    created_at: new Date().toISOString(),
    intake,
  };

  try {
    const draft = await generateScopeDraftFromIntake(intake, activation, env);
    const created = await createScopedProjectDraft(env, intake, draft);
    await writeScopeDraftToSupabase(created.projectId, draft, env, { status: 'scoped' });
    await sendScopeGeneratedAdminEmail(env, created.projectId, activation, intake, draft);

    const milestonesRes = await fetch(`${cleanSecret(env.SUPABASE_URL!)}/rest/v1/milestones?project_id=eq.${encodeURIComponent(created.projectId)}&select=*&order=due_date.asc`, {
      headers: {
        'apikey': getSupabaseServiceKey(env),
        'Authorization': `Bearer ${getSupabaseServiceKey(env)}`,
      },
    });
    const milestones = milestonesRes.ok ? await milestonesRes.json() : [];

    return json({
      ok: true,
      project: {
        ...created.project,
        id: created.projectId,
        email,
        name: intake.projectTitle,
        tier: draft.activation_band,
        billing: 'one_time',
        status: 'scoped',
        description: draft.summary,
        ai_price_min_cad: draft.pricing?.suggested_min_cad ?? null,
        ai_price_max_cad: draft.pricing?.suggested_max_cad ?? null,
        ai_price_rationale: draft.pricing?.rationale ?? null,
        ai_price_confidence: draft.pricing?.confidence ?? null,
      },
      milestones,
      draft,
    }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not create intake draft.' }, 500, origin);
  }
}

async function handleAdminPublishScope(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body.' }, 400, origin);
  }

  const projectId = sanitize(body.project_id, 80);
  if (!projectId) return json({ error: 'project_id required.' }, 400, origin);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  const [projectRes, milestonesRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=*`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
    fetch(`${supabaseUrl}/rest/v1/milestones?project_id=eq.${encodeURIComponent(projectId)}&select=*&order=due_date.asc`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
  ]);

  if (!projectRes.ok || !milestonesRes.ok) {
    return json({ error: 'Could not load project scope.' }, 502, origin);
  }

  const projects = await projectRes.json() as Array<Record<string, unknown>>;
  const milestones = await milestonesRes.json() as Array<{ title?: string; description?: string; due_date?: string }>;
  const project = projects[0];
  if (!project) return json({ error: 'Project not found.' }, 404, origin);
  if (!milestones.length) return json({ error: 'Project has no milestones to publish.' }, 409, origin);

  const draft: ScopeDraft = {
    summary: sanitize(project.name, 600) || 'Your project scope has been prepared and is ready for review.',
    problem_statement: 'We translated your intake into a structured scope and decision-ready plan.',
    solution_direction: 'Review the scoped plan, confirm the engagement letter, and approve the next build step.',
    activation_band: normalizeActivationBand(sanitize(project.tier, 80) || 'standard_activation'),
    milestones: milestones.slice(0, 3).map((milestone, index) => ({
      title: sanitize(milestone.title, 120) || `Milestone ${index + 1}`,
      description: sanitize(milestone.description, 280) || 'Milestone details are ready for review.',
      due_offset_days: [7, 21, 45][index],
    })),
    pricing: normalizePriceInsight({
      suggested_min_cad: project.ai_price_min_cad,
      suggested_max_cad: project.ai_price_max_cad,
      rationale: project.ai_price_rationale,
      confidence: project.ai_price_confidence,
    }, sanitize(project.tier, 80)),
  };

  try {
    await ensureContractForProject(env, projectId, ADMIN_EMAIL);
    await sendScopeReadyClientEmail(env, projectId, {
      email: sanitize(project.email, 160).toLowerCase(),
      tier: sanitize(project.tier, 80),
      billing: sanitize(project.billing, 80) || 'one_time',
    }, {
      name: sanitize(project.name, 120),
      email: sanitize(project.email, 160).toLowerCase(),
      company: sanitize(project.name, 120),
      projectTitle: sanitize(project.name, 120),
    }, draft);

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ status: 'awaiting_approval' }),
    });
    if (!updateRes.ok) {
      const error = await updateRes.text();
      return json({ error: `Could not move project to awaiting approval: ${error}` }, 502, origin);
    }
    const updatedRows = await updateRes.json() as Array<Record<string, unknown>>;
    return json({ ok: true, project: updatedRows[0], milestones }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not publish scope.' }, 500, origin);
  }
}

async function handleAdminProjectStatus(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body.' }, 400, origin);
  }

  const projectId = sanitize(body.project_id, 80);
  const nextStatus = sanitize(body.status, 80).toLowerCase();
  const override = body.override === true;
  if (!projectId || !nextStatus) return json({ error: 'project_id and status are required.' }, 400, origin);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  await reconcilePaidInstantBills(env, projectId).catch(() => undefined);

  const [projectRes, contractRes, invoiceRes, instantBillRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=*`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
    fetch(`${supabaseUrl}/rest/v1/contracts?project_id=eq.${encodeURIComponent(projectId)}&select=id,status,signed_at&order=created_at.desc&limit=1`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
    fetch(`${supabaseUrl}/rest/v1/invoices?project_id=eq.${encodeURIComponent(projectId)}&select=id,status,due_date,amount_cad`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
    fetch(`${supabaseUrl}/rest/v1/instant_bills?project_id=eq.${encodeURIComponent(projectId)}&select=id,status,amount_cad,description,payment_link_url,paid_at`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
  ]);

  if (!projectRes.ok || !contractRes.ok || !invoiceRes.ok || !instantBillRes.ok) {
    return json({ error: 'Could not load project payment state.' }, 502, origin);
  }

  const [project] = await projectRes.json() as Array<Record<string, unknown>>;
  const [contract] = await contractRes.json() as Array<{ id: string; status?: string; signed_at?: string | null }>;
  const invoices = await invoiceRes.json() as Array<{ id: string; status?: string; amount_cad?: number }>;
  const instantBills = await instantBillRes.json() as Array<{ id: string; status?: string; amount_cad?: number; description?: string; payment_link_url?: string }>;
  if (!project) return json({ error: 'Project not found.' }, 404, origin);

  const paidInstantBills = instantBills.filter((bill) => (bill.status ?? '').toLowerCase() === 'paid');
  const outstandingInvoices = invoices.filter((invoice) => !['paid', 'void'].includes((invoice.status ?? '').toLowerCase()));
  const outstandingInstantBills = instantBills.filter((bill) => !['paid', 'void'].includes((bill.status ?? '').toLowerCase()));

  if (nextStatus === 'active' && !override) {
    if ((contract?.status ?? '').toLowerCase() !== 'signed') {
      return json({ error: 'Cannot move to active without a signed engagement letter.' }, 409, origin);
    }
    if (paidInstantBills.length === 0 && invoices.every((invoice) => (invoice.status ?? '').toLowerCase() !== 'paid')) {
      return json({ error: 'Cannot move to active without a paid build deposit.' }, 409, origin);
    }
  }

  if (nextStatus === 'complete' && !override) {
    if (outstandingInvoices.length > 0 || outstandingInstantBills.length > 0) {
      return json({ error: 'Cannot mark complete while payments are still outstanding.' }, 409, origin);
    }
  }

  const updateRes = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ status: nextStatus }),
  });
  if (!updateRes.ok) {
    const error = await updateRes.text();
    return json({ error: `Could not update project status: ${error}` }, 502, origin);
  }
  const updatedRows = await updateRes.json() as Array<Record<string, unknown>>;

  return json({
    ok: true,
    project: updatedRows[0],
    gates: {
      contract_signed: (contract?.status ?? '').toLowerCase() === 'signed',
      deposit_paid: paidInstantBills.length > 0 || invoices.some((invoice) => (invoice.status ?? '').toLowerCase() === 'paid'),
      outstanding_invoices: outstandingInvoices.length,
      outstanding_instant_bills: outstandingInstantBills.length,
    },
  }, 200, origin);
}

async function handleProjectHome(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyUser(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status ?? 401, origin);

  const url = new URL(req.url);
  const projectId = sanitize(url.searchParams.get('project_id') ?? url.searchParams.get('id') ?? '', 80);
  if (!projectId) return json({ error: 'project_id required.' }, 400, origin);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);
  await reconcilePaidInstantBills(env, projectId).catch(() => undefined);

  const [projectRes, milestonesRes, contractRes, invoiceRes, instantBillRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=*`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
    fetch(`${supabaseUrl}/rest/v1/milestones?project_id=eq.${encodeURIComponent(projectId)}&select=*&order=due_date.asc`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
    fetch(`${supabaseUrl}/rest/v1/contracts?project_id=eq.${encodeURIComponent(projectId)}&select=*&order=created_at.desc&limit=1`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
    fetch(`${supabaseUrl}/rest/v1/invoices?project_id=eq.${encodeURIComponent(projectId)}&select=*&order=created_at.desc`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
    fetch(`${supabaseUrl}/rest/v1/instant_bills?project_id=eq.${encodeURIComponent(projectId)}&select=*&order=created_at.desc`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }),
  ]);

  if (!projectRes.ok || !milestonesRes.ok || !contractRes.ok || !invoiceRes.ok || !instantBillRes.ok) {
    return json({ error: 'Could not load project home.' }, 502, origin);
  }

  const [project] = await projectRes.json() as Array<Record<string, unknown>>;
  if (!project) return json({ error: 'Project not found.' }, 404, origin);
  if (auth.user.email !== ADMIN_EMAIL && sanitize(project.email, 160).toLowerCase() !== auth.user.email.toLowerCase()) {
    return json({ error: 'Forbidden.' }, 403, origin);
  }

  const milestones = await milestonesRes.json() as Array<Record<string, unknown>>;
  const [contract] = await contractRes.json() as Array<Record<string, unknown>>;
  const invoices = await invoiceRes.json() as Array<Record<string, unknown>>;
  const instantBills = await instantBillRes.json() as Array<Record<string, unknown>>;
  const siteUrl = getSiteUrl(env);
  const clientStatus = mapClientStatus(sanitize(project.status, 80));
  const nextMilestone = milestones.find((milestone) => !['approved', 'complete', 'completed', 'done'].includes(sanitize(milestone.status, 80).toLowerCase())) ?? null;
  const paidInstantBills = instantBills.filter((bill) => sanitize(bill.status, 80).toLowerCase() === 'paid');
  const unpaidInstantBills = instantBills.filter((bill) => !['paid', 'void'].includes(sanitize(bill.status, 80).toLowerCase()));
  const unpaidInvoices = invoices.filter((invoice) => !['paid', 'void'].includes(sanitize(invoice.status, 80).toLowerCase()));
  const awaitingOnClient: Array<{ title: string; detail: string; action_url?: string }> = [];
  const awaitingOnUs: Array<{ title: string; detail: string }> = [];

  if (sanitize(project.status, 80).toLowerCase() === 'scoped') {
    awaitingOnUs.push({
      title: 'Internal scope review',
      detail: 'We are finalizing the scope pack before we publish it to your portal.',
    });
  }
  if ((contract?.status ?? '').toString().toLowerCase() !== 'signed') {
    awaitingOnClient.push({
      title: 'Sign the engagement letter',
      detail: 'We need the engagement letter signed before build can move forward.',
      action_url: `${siteUrl}/dashboard/contract?id=${encodeURIComponent(projectId)}`,
    });
  }
  if (paidInstantBills.length === 0 && unpaidInstantBills.length > 0) {
    const depositBill = unpaidInstantBills[0];
    awaitingOnClient.push({
      title: 'Pay the build deposit',
      detail: 'Build starts once the build deposit is paid.',
      action_url: sanitize(depositBill.payment_link_url, 500) || undefined,
    });
  }
  const reviewMilestone = milestones.find((milestone) => sanitize(milestone.status, 80).toLowerCase() === 'review');
  if (reviewMilestone) {
    awaitingOnClient.push({
      title: `Review ${sanitize(reviewMilestone.title, 120) || 'current milestone'}`,
      detail: 'We are waiting on your approval or change request for the current review item.',
    });
  }
  if (!nextMilestone) {
    awaitingOnUs.push({
      title: 'Preparing the next update',
      detail: 'We are packaging the next deliverable and update notes.',
    });
  } else if (sanitize(project.status, 80).toLowerCase() === 'active') {
    awaitingOnUs.push({
      title: `Working on ${sanitize(nextMilestone.title, 120) || 'the next milestone'}`,
      detail: 'This is the current focus on our side.',
    });
  }

  const decisions = [
    {
      title: 'Selected service track',
      detail: getTierLabel(sanitize(project.tier, 80) || 'standard_activation'),
    },
    sanitize(project.name, 600)
      ? { title: 'Project summary', detail: sanitize(project.name, 600) }
      : null,
    project.ai_price_min_cad && project.ai_price_max_cad
      ? {
          title: 'Build recommendation',
          detail: `CA$${Number(project.ai_price_min_cad).toLocaleString('en-CA')} - CA$${Number(project.ai_price_max_cad).toLocaleString('en-CA')}`,
        }
      : null,
  ].filter(Boolean);

  const artifacts = [
    { title: 'Proposal view', type: 'proposal', url: `${siteUrl}/dashboard/proposal?id=${encodeURIComponent(projectId)}` },
    { title: 'Engagement letter', type: 'contract', url: `${siteUrl}/dashboard/contract?id=${encodeURIComponent(projectId)}` },
    ...invoices.map((invoice) => ({
      title: sanitize(invoice.invoice_number, 120) || 'Invoice',
      type: 'invoice',
      url: invoice.milestone_id ? `${siteUrl}/dashboard/invoice?milestone_id=${encodeURIComponent(String(invoice.milestone_id))}` : undefined,
      created_at: invoice.created_at,
    })),
    ...milestones
      .filter((milestone) => Boolean(sanitize(milestone.proof_url, 500)))
      .map((milestone) => ({
        title: sanitize(milestone.title, 120) || 'Milestone proof',
        type: 'deliverable',
        url: sanitize(milestone.proof_url, 500),
        note: sanitize(milestone.proof_note, 280),
      })),
  ];

  const progressNotes = [
    { title: 'Project created', body: 'Your workspace is open and the project record is active.', created_at: project.created_at },
    project.ai_price_generated_at
      ? { title: 'Scope priced', body: sanitize(project.ai_price_rationale, 320) || 'We generated the first commercial recommendation for this project.', created_at: project.ai_price_generated_at }
      : null,
    contract?.sent_at
      ? { title: 'Engagement letter sent', body: 'The engagement letter is ready for review and signature.', created_at: contract.sent_at }
      : null,
    contract?.signed_at
      ? { title: 'Engagement letter signed', body: 'The engagement letter has been signed.', created_at: contract.signed_at }
      : null,
  ].filter(Boolean);

  const approvals = [
    {
      title: 'Scope approval',
      status: sanitize(project.status, 80).toLowerCase() === 'awaiting_approval' ? 'pending' : 'in_progress',
      action_url: `${siteUrl}/dashboard/proposal?id=${encodeURIComponent(projectId)}`,
    },
    {
      title: 'Engagement letter',
      status: (contract?.status ?? '').toString().toLowerCase() === 'signed' ? 'approved' : 'pending',
      action_url: `${siteUrl}/dashboard/contract?id=${encodeURIComponent(projectId)}`,
    },
  ];

  const outstandingBalance = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount_cad ?? 0), 0)
    + unpaidInstantBills.reduce((sum, bill) => sum + Number(bill.amount_cad ?? 0), 0);

  return json({
    ok: true,
    project,
    client_status: clientStatus,
    current_phase: {
      title: clientStatus.label,
      meaning: clientStatus.description,
      expected_outcome: nextMilestone
        ? `Next checkpoint: ${sanitize(nextMilestone.title, 120) || 'Upcoming milestone'}`
        : 'Complete the outstanding approval and payment items to move to the next phase.',
    },
    decisions,
    awaiting_on_us: awaitingOnUs,
    awaiting_on_client: awaitingOnClient,
    artifacts,
    payments: {
      activation_fee_status: sanitize(project.stripe_session_id, 120) ? 'paid' : 'not_tracked',
      deposit_status: paidInstantBills.length > 0 ? 'paid' : unpaidInstantBills.length > 0 ? 'due' : 'not_requested',
      invoices_sent: invoices.length,
      invoices_paid: invoices.filter((invoice) => sanitize(invoice.status, 80).toLowerCase() === 'paid').length,
      outstanding_balance_cad: outstandingBalance,
      next_payment_link: sanitize(unpaidInstantBills[0]?.payment_link_url, 500) || undefined,
    },
    progress_notes: progressNotes,
    next_milestone: nextMilestone,
    approvals,
    milestones,
    contract: contract ?? null,
    invoices,
    instant_bills: instantBills,
  }, 200, origin);
}

async function handleAdminAutoCollectList(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  const url = new URL(req.url);
  const status = sanitize(url.searchParams.get('status') ?? '', 40);
  const limitRaw = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 50;

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const filters = [
    'select=*',
    'order=due_date.asc',
    `limit=${limit}`,
  ];
  if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);

  const res = await fetch(`${supabaseUrl}/rest/v1/autocollect_items?${filters.join('&')}`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    return json({ error: `Failed to fetch AutoCollect items: ${error}` }, 502, origin);
  }

  const items = await res.json() as AutoCollectRecord[];
  return json({ ok: true, items }, 200, origin);
}

async function handleAdminAutoCollectHealth(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  try {
    const health = await getAutoCollectHealth(env);
    return json({ ok: true, health }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to fetch AutoCollect health.' }, 502, origin);
  }
}

async function handleAdminAutoCollectSync(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    // Optional body.
  }

  const overdueOnly = body.overdue_only !== false;
  const limitRaw = Number(body.limit);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 100;

  try {
    const result = await syncAutoCollectItems(env, { overdueOnly, limit });
    return json({ ok: true, ...result }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to sync AutoCollect items.' }, 502, origin);
  }
}

// ── Spark helpers ─────────────────────────────────────────────────────

function getSparkEnabled(env: Env): boolean {
  return (env.SPARK_ENABLED ?? '').trim() === '1';
}

function getSparkPreviewTurns(env: Env): number {
  const n = parseInt(env.SPARK_PREVIEW_TURNS ?? '3', 10);
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

function getSparkMaxTurns(env: Env): number {
  const n = parseInt(env.SPARK_MAX_TURNS ?? '20', 10);
  return Number.isFinite(n) && n >= 1 ? n : 20;
}

function getSparkMaxTokensPerTurn(env: Env): number {
  const n = parseInt(env.SPARK_MAX_TOKENS_PER_TURN ?? '300', 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 2000) : 300;
}

function getSparkRateLimitWindowMs(env: Env): number {
  const n = parseInt(env.SPARK_RATE_LIMIT_WINDOW_MS ?? '60000', 10);
  return Number.isFinite(n) && n >= 1000 ? n : 60000;
}

function getSparkRateLimitMax(env: Env): number {
  const n = parseInt(env.SPARK_RATE_LIMIT_MAX ?? '20', 10);
  return Number.isFinite(n) && n >= 1 ? n : 20;
}

function getSparkPassPriceCad(env: Env): number {
  const n = parseFloat(env.SPARK_PASS_PRICE_CAD ?? '5');
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function getSparkClientIp(req: Request): string {
  const header =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for') ||
    'anonymous';
  return (header.split(',')[0] || '').trim().toLowerCase() || 'anonymous';
}

const SPARK_PASS_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function checkSparkIpRateLimit(ip: string, windowMs: number, maxRequests: number): boolean {
  const now = Date.now();
  const existing = sparkIpRateLimitStore.get(ip) ?? [];
  const kept = existing.filter((ts) => now - ts < windowMs);
  kept.push(now);
  sparkIpRateLimitStore.set(ip, kept);
  return kept.length > maxRequests;
}

async function verifySparkPass(stripe: Stripe, passSessionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await stripe.checkout.sessions.retrieve(passSessionId);
    if (session.metadata?.checkout_type !== 'spark_pass') {
      return { ok: false, error: 'Invalid pass type.' };
    }
    if (session.payment_status !== 'paid') {
      return { ok: false, error: 'Pass payment is not complete.' };
    }
    const createdAt = session.created * 1000;
    if (Date.now() - createdAt > SPARK_PASS_EXPIRY_MS) {
      return { ok: false, error: 'Spark pass has expired.' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not verify pass.' };
  }
}

// POST /api/spark/chat
async function handleSparkChat(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (!getSparkEnabled(env)) {
    return json({ error: 'Spark is currently unavailable.' }, 503, origin);
  }

  const ip = getSparkClientIp(req);
  const windowMs = getSparkRateLimitWindowMs(env);
  const maxRequests = getSparkRateLimitMax(env);
  if (checkSparkIpRateLimit(ip, windowMs, maxRequests)) {
    return json({ error: 'Too many requests. Please wait before sending another message.' }, 429, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const message = sanitize(body.message, 2000).trim();
  if (!message) {
    return json({ error: 'message is required.' }, 400, origin);
  }

  const turnNumber = Math.max(1, parseInt(String(body.turn_number ?? '1'), 10) || 1);
  const passSessionId = sanitize(body.pass_session_id, 200).trim();
  const previewTurns = getSparkPreviewTurns(env);
  const maxTurns = getSparkMaxTurns(env);
  const maxTokens = getSparkMaxTokensPerTurn(env);

  // Determine if this is a preview turn
  const isPreviewTurn = turnNumber <= previewTurns;

  if (!isPreviewTurn) {
    // Past the preview — require a valid Spark pass
    if (!passSessionId) {
      return json({
        error: 'Preview turns exhausted. A Spark pass is required to continue.',
        requires_pass: true,
        preview_turns: previewTurns,
      }, 402, origin);
    }

    let stripe: Stripe;
    try {
      stripe = getStripe(env);
    } catch {
      return json({ error: 'Payment service is not configured.' }, 500, origin);
    }

    const passCheck = await verifySparkPass(stripe, passSessionId);
    if (!passCheck.ok) {
      return json({
        error: passCheck.error,
        requires_pass: true,
        preview_turns: previewTurns,
      }, 402, origin);
    }
  }

  if (turnNumber > maxTurns) {
    return json({
      error: `Session limit of ${maxTurns} turns reached. Please start a new session.`,
      session_limit_reached: true,
      max_turns: maxTurns,
    }, 429, origin);
  }

  if (!env.OPENAI_API_KEY) {
    return json({ error: 'AI service is not configured.' }, 500, origin);
  }

  const systemPrompt = `You are Spark, the Una Labs AI assistant. You help founders and operators understand the Una Labs platform, services, and delivery model. Be concise, direct, and helpful. Do not make up pricing or dates. Direct users to /start to begin a project or /pricing for plan details.`;

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanSecret(env.OPENAI_API_KEY)}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      logEvent('spark_chat_openai_error', { status: aiRes.status, error: err.slice(0, 200) });
      return json({ error: 'AI request failed. Please try again.' }, 502, origin);
    }

    const aiData = await aiRes.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const reply = aiData.choices?.[0]?.message?.content?.trim() ?? '';
    if (!reply) {
      return json({ error: 'No response from AI.' }, 502, origin);
    }

    logEvent('spark_chat_success', {
      ip,
      turn_number: turnNumber,
      is_preview: isPreviewTurn,
      has_pass: Boolean(passSessionId),
      tokens_used: aiData.usage?.total_tokens ?? 0,
    });

    return json({
      ok: true,
      reply,
      turn_number: turnNumber,
      preview_turns: previewTurns,
      max_turns: maxTurns,
      is_preview: isPreviewTurn,
      turns_remaining: Math.max(0, maxTurns - turnNumber),
    }, 200, origin);
  } catch (err) {
    logEvent('spark_chat_exception', { error: err instanceof Error ? err.message : 'unknown' });
    return json({ error: 'An error occurred. Please try again.' }, 500, origin);
  }
}

// POST /api/spark/create-pass
async function handleSparkCreatePass(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (!getSparkEnabled(env)) {
    return json({ error: 'Spark is currently unavailable.' }, 503, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400, origin);
  }

  const email = sanitize(body.email, 200).trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return json({ error: 'A valid email is required.' }, 400, origin);
  }

  let stripe: Stripe;
  try {
    stripe = getStripe(env);
  } catch {
    return json({ error: 'Payment service is not configured.' }, 500, origin);
  }

  const siteUrl = getSiteUrl(env);
  const priceCad = getSparkPassPriceCad(env);
  const sparkPriceId = env.STRIPE_PRICE_SPARK_PASS ? cleanSecret(env.STRIPE_PRICE_SPARK_PASS) : null;

  try {
    let session: Stripe.Checkout.Session;
    const metadata = {
      checkout_type: 'spark_pass',
      email,
      service_type: 'spark_ai_pass',
    };

    if (sparkPriceId) {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: [{ price: sparkPriceId, quantity: 1 }],
        success_url: `${siteUrl}/spark/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/spark`,
        metadata,
        payment_intent_data: { metadata },
        locale: 'en',
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'cad',
              unit_amount: Math.round(priceCad * 100),
              product_data: {
                name: 'Spark AI Pass',
                description: 'Unlimited Spark AI chat session on Una Labs (90-day pass).',
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/spark/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/spark`,
        metadata,
        payment_intent_data: { metadata },
        locale: 'en',
      });
    }

    logEvent('spark_create_pass_success', { email, livemode: session.livemode, sessionId: session.id });
    return json({ url: session.url }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error.';
    logEvent('spark_create_pass_error', { email, message });
    return json({ error: message }, 500, origin);
  }
}

// GET /api/spark/verify-pass
async function handleSparkVerifyPass(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (!getSparkEnabled(env)) {
    return json({ error: 'Spark is currently unavailable.' }, 503, origin);
  }

  const url = new URL(req.url);
  const passSessionId = sanitize(url.searchParams.get('session_id') ?? '', 200).trim();
  if (!passSessionId) {
    return json({ error: 'session_id is required.' }, 400, origin);
  }

  let stripe: Stripe;
  try {
    stripe = getStripe(env);
  } catch {
    return json({ error: 'Payment service is not configured.' }, 500, origin);
  }

  const result = await verifySparkPass(stripe, passSessionId);
  if (!result.ok) {
    return json({ ok: false, error: result.error }, 402, origin);
  }

  return json({
    ok: true,
    preview_turns: getSparkPreviewTurns(env),
    max_turns: getSparkMaxTurns(env),
  }, 200, origin);
}

async function handleAdminAutoCollectSendInvite(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body.' }, 400, origin);
  }

  const autoCollectId = sanitize(body.id, 80);
  if (!autoCollectId) return json({ error: 'id required.' }, 400, origin);

  const supabaseUrl = cleanSecret(env.SUPABASE_URL!);
  const serviceKey = getSupabaseServiceKey(env);

  const itemRes = await fetch(`${supabaseUrl}/rest/v1/autocollect_items?id=eq.${encodeURIComponent(autoCollectId)}&select=*`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!itemRes.ok) return json({ error: 'Failed to fetch AutoCollect item.' }, 502, origin);
  const items = await itemRes.json() as AutoCollectRecord[];
  const item = items[0];
  if (!item) return json({ error: 'AutoCollect item not found.' }, 404, origin);

  const result = await sendAutoCollectInviteForItem(env, item, { force: true });
  if (!result.ok) {
    if (result.skipped) {
      const status = result.skipped.startsWith('daily_email_cap_reached') ? 429 : 409;
      return json({ error: result.skipped }, status, origin);
    }
    return json({ error: result.error ?? 'Failed to send payment invite.' }, 502, origin);
  }

  return json({ ok: true, item: result.item }, 200, origin);
}

type GitHubLabel = {
  name: string;
  color: string;
};

type GitHubUser = {
  login: string;
  avatar_url: string;
  html_url: string;
};

type GitHubIssueRaw = {
  number: number;
  title: string;
  html_url: string;
  state: string;
  labels: GitHubLabel[];
  assignee: GitHubUser | null;
  assignees: GitHubUser[];
  updated_at: string;
  created_at: string;
  body: string | null;
};

type GitHubIssueSummary = {
  number: number;
  title: string;
  url: string;
  status_label: string | null;
  area_labels: string[];
  assignee: string | null;
  updated_at: string;
};

async function handleAdminGitHubIssues(req: Request, env: Env, origin: string | null): Promise<Response> {
  const auth = await verifyAdmin(req, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error === 'Forbidden.' ? 403 : 401, origin);

  const token = env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'una-labs-admin/1.0',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      'https://api.github.com/repos/fefejiro/FTC-HOLDING/issues?state=open&type=issue&per_page=100',
      { headers }
    );
    if (!res.ok) {
      const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
      if (res.status === 403 && rateLimitRemaining === '0') {
        return json({ error: 'GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase limits.' }, 429, origin);
      }
      return json({ error: `GitHub API error: ${res.status}` }, 502, origin);
    }

    const rawIssues = await res.json() as GitHubIssueRaw[];

    const issues: GitHubIssueSummary[] = rawIssues
      .filter((issue) => !('pull_request' in issue))
      .map((issue) => {
        const labelNames = (issue.labels ?? []).map((l) => l.name);
        const statusLabel = labelNames.find((n) => n.startsWith('status:')) ?? null;
        const areaLabels = labelNames.filter((n) => n.startsWith('area:'));
        return {
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          status_label: statusLabel,
          area_labels: areaLabels,
          assignee: issue.assignee?.login ?? (issue.assignees?.[0]?.login ?? null),
          updated_at: issue.updated_at,
        };
      });

    return json({ issues }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to fetch GitHub issues.' }, 502, origin);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin');

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname.startsWith('/api/jobagent/')) {
      try {
        return await handleJobAgentRoute(req, env, getStripe(env), origin)
          || json({ error: 'Not found.' }, 404, origin);
      } catch (error) {
        logEvent('jobagent_route_failed', {
          path: url.pathname,
          errorClass: error instanceof Error ? error.name : 'UnknownError',
        });
        return json({ error: 'JobAgent billing service is unavailable.' }, 503, origin);
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/checkout-success') {
      return handleCheckoutSuccess(req, env);
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      return json(await getPublicStatusSummary(req, env), 200, origin);
    }

    // ── Spark AI chat routes ──────────────────────────────────────────────
    if (req.method === 'POST' && url.pathname === '/api/spark/chat') {
      return handleSparkChat(req, env, origin);
    }
    if (req.method === 'POST' && url.pathname === '/api/spark/create-pass') {
      return handleSparkCreatePass(req, env, origin);
    }
    if (req.method === 'GET' && url.pathname === '/api/spark/verify-pass') {
      return handleSparkVerifyPass(req, env, origin);
    }

    if (req.method === 'GET' && url.pathname === '/api/invoices') {
      return handleGetInvoices(req, env, origin);
    }

    if (req.method === 'GET' && url.pathname === '/api/project-home') {
      return handleProjectHome(req, env, origin);
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/autocollect') {
      return handleAdminAutoCollectList(req, env, origin);
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/autocollect/health') {
      return handleAdminAutoCollectHealth(req, env, origin);
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/status-summary') {
      return handleAdminStatusSummary(req, env, origin);
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/leads') {
      return handleAdminLeadsList(req, env, origin);
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/github-issues') {
      return handleAdminGitHubIssues(req, env, origin);
    }

    if (req.method === 'PATCH' && /^\/api\/admin\/leads\/[^/]+$/.test(url.pathname)) {
      return handleAdminUpdateLead(req, env, origin);
    }

    if (req.method === 'POST' && /^\/api\/admin\/reprice\/[^/]+$/.test(url.pathname)) {
      return handleAdminReprice(req, env, origin);
    }

    if (req.method === 'GET' && /^\/api\/admin\/branding\/[^/]+$/.test(url.pathname)) {
      return handleAdminGetBranding(req, env, origin);
    }

    if (req.method === 'PATCH' && /^\/api\/admin\/branding\/[^/]+$/.test(url.pathname)) {
      return handleAdminSetBranding(req, env, origin);
    }

    // Phase 15: Webhooks
    if (req.method === 'GET' && /^\/api\/admin\/webhooks\/[^/]+$/.test(url.pathname)) {
      return handleAdminListWebhooks(req, env, origin);
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/webhooks') {
      return handleAdminCreateWebhook(req, env, origin);
    }
    if (req.method === 'DELETE' && /^\/api\/admin\/webhooks\/[^/]+$/.test(url.pathname)) {
      return handleAdminDeleteWebhook(req, env, origin);
    }

    // Phase 14: Stripe Connect (multi-tenancy foundation)
    if (req.method === 'GET' && /^\/api\/admin\/connect\/[^/]+$/.test(url.pathname)) {
      return handleAdminGetConnect(req, env, origin);
    }
    if (req.method === 'POST' && /^\/api\/admin\/connect\/[^/]+\/onboard$/.test(url.pathname)) {
      return handleAdminConnectOnboard(req, env, origin);
    }
    if (req.method === 'POST' && /^\/api\/admin\/connect\/[^/]+\/dashboard$/.test(url.pathname)) {
      return handleAdminConnectDashboard(req, env, origin);
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
      return json(
        {
          service: 'una-stripe-api',
          ok: true,
          docs: {
            admin_status_summary: '/api/admin/status-summary',
            checkout_success: '/api/checkout-success',
            jobagent_checkout: '/api/jobagent/checkout',
          },
        },
        200,
        origin
      );
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, origin);
    }

    switch (url.pathname) {
      case '/api/stripe-webhook':
        return handleStripeWebhook(req, env, origin);
      case '/api/create-checkout-session':
        return handleCreateCheckoutSession(req, env, origin);
      case '/api/activate-project':
        return handleActivateProject(req, env, origin);
      case '/api/contracts/ensure':
        return handleEnsureContract(req, env, origin);
      case '/api/contracts/sign':
        return handleSignContract(req, env, origin);
      case '/api/invoices/generate':
        return handleGenerateInvoice(req, env, origin);
      case '/api/subscribe':
        return handleSubscribe(req, env, origin);
      case '/api/leads':
        return handlePublicSubmitLead(req, env, origin);
      case '/api/milestone-action':
        return handleMilestoneAction(req, env, origin);
      case '/api/intake-confirm':
        return handleIntakeConfirm(req, env, origin);
      case '/api/admin/billing':
        return handleAdminBilling(req, env, origin);
      case '/api/admin/subscription-action':
        return handleAdminSubscriptionAction(req, env, origin);
      case '/api/admin/instant-bill':
        return handleAdminInstantBill(req, env, origin);
      case '/api/admin/intake-draft':
        return handleAdminIntakeDraft(req, env, origin);
      case '/api/admin/projects/publish-scope':
        return handleAdminPublishScope(req, env, origin);
      case '/api/admin/projects/status':
        return handleAdminProjectStatus(req, env, origin);
      case '/api/admin/autocollect/sync':
        return handleAdminAutoCollectSync(req, env, origin);
      case '/api/admin/autocollect/send-invite':
        return handleAdminAutoCollectSendInvite(req, env, origin);
      default:
        return json({ error: 'Not found.' }, 404, origin);
    }
  },
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const result = await runAutoCollectReminderCycle(env);
      logEvent('autocollect_scheduled_run', {
        synced: result.synced,
        reconciled_paid: result.reconciled_paid,
        invited: result.invited,
        skipped: result.skipped,
        errors: result.errors,
        reminder_interval_days: getAutoCollectReminderIntervalDays(env),
        max_attempts: getAutoCollectMaxAttempts(env),
        daily_email_cap: getAutoCollectDailyEmailCap(env),
        max_send_per_run: getAutoCollectMaxSendPerRun(env),
      });
    } catch (error) {
      logEvent('autocollect_scheduled_run_failed', {
        error: error instanceof Error ? error.message : 'Unknown scheduled AutoCollect failure.',
      });
    }
  },
};
