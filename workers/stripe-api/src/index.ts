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
}

function shouldDeliverBridgeWebhook(env: Env): boolean {
  const mode = (env.UNALABS_PROJECT_PIPELINE_MODE ?? 'worker_only').trim().toLowerCase();
  return mode === 'hybrid' && Boolean(env.UNALABS_NEW_PROJECT_WEBHOOK_URL);
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  const allowedKeys = ['intakeId', 'name', 'email', 'company', 'role', 'teamSize', 'plan', 'billing'];
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
  email: string; tier: string; billing: string; session_id: string; created_at: string;
}, name?: string): Promise<void> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) return;

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

const ADMIN_EMAIL = 'mike.fejiro@gmail.com';

function getSupabaseApiKey(env: Env): string {
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY;
  if (!env.SUPABASE_URL || !key) throw new Error('Supabase not configured.');
  return cleanSecret(key);
}

function getSupabaseServiceKey(env: Env): string {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase service role not configured.');
  return cleanSecret(env.SUPABASE_SERVICE_ROLE_KEY);
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
    logEvent('create_checkout_session_start', {
      email,
      tier,
      billing,
      intakeId,
      origin,
      stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: getCheckoutSuccessUrl(req, env),
      cancel_url: `${siteUrl}/pricing`,
      metadata: { email, tier, billing, intake_id: intakeId },
      subscription_data: { trial_period_days: 14 },
      billing_address_collection: 'required',
      phone_number_collection: { enabled: false },
      locale: 'en',
    });
    logEvent('create_checkout_session_success', {
      email,
      tier,
      billing,
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
      intakeId,
      message,
    });
    return json({ error: message }, 500, origin);
  }
}

async function writeProjectToSupabase(env: Env, activation: {
  email: string; tier: string; billing: string; intake_id: string; session_id: string; created_at: string;
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
      name: sanitize(intake.name, 120),
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

  // Step 1: Call OpenAI API to generate milestones
  let milestones: Array<{ title: string; description: string; due_offset_days: number }> = [];
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
              content: 'You are a project scoping assistant for Una Labs, a Canadian digital agency. Given a client intake, produce exactly 3 milestones in JSON. Each milestone has: title (string), description (string, 1-2 sentences), due_offset_days (integer — days from today: 7, 21, 45). Return ONLY a JSON array of 3 objects. No prose.',
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

      milestones = JSON.parse(jsonStr) as Array<{ title: string; description: string; due_offset_days: number }>;
      if (!Array.isArray(milestones) || milestones.length !== 3) {
        logEvent('generate_scope_parse_error', {
          projectId,
          error: 'Expected 3 milestones',
          received: milestones.length,
        });
        return;
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
      body: JSON.stringify({ status: 'scoped' }),
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

    const milestonesHtml = milestones
      .map((m) => {
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + m.due_offset_days);
        const dateStr = dueDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
        return `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#0B0E11;font-size:14px">${m.title}</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:14px">${dateStr}</td></tr>`;
      })
      .join('');

    const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">Your project scope is ready</p>
  </div>
  <p style="font-size:15px;color:#0B0E11;margin-bottom:16px">Hi ${firstName},</p>
  <p style="font-size:14px;color:#374151;margin-bottom:20px">We've generated your project scope with 3 milestones. Review them below and let us know if you'd like any adjustments.</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr><th style="padding:8px 12px;text-align:left;background:#F9FAFB;color:#6B7280;font-size:13px;font-weight:600;border-bottom:1px solid #E5E7EB">Milestone</th><th style="padding:8px 12px;text-align:left;background:#F9FAFB;color:#6B7280;font-size:13px;font-weight:600;border-bottom:1px solid #E5E7EB">Due Date</th></tr>
    ${milestonesHtml}
  </table>
  <a href="https://unalabs.cloud/login?redirect=/dashboard" style="display:inline-block;background:#F97316;color:white;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px">View in dashboard</a>
  <p style="font-size:12px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px">Questions? Reply here or email hello@unalabs.cloud<br>Una Labs · unalabs.cloud</p>
</div>`;

    const credentials = btoa(`${cleanSecret(env.MAILJET_API_KEY)}:${cleanSecret(env.MAILJET_SECRET_KEY)}`);
    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: 'hello@unalabs.cloud', Name: 'Una Labs' },
            To: [{ Email: activation.email, Name: name }],
            Subject: 'Your project scope is ready — Una Labs',
            HTMLPart: html,
            TextPart: `Hi ${firstName},\n\nYour project scope is ready with 3 milestones:\n\n${milestones.map((m) => `• ${m.title}`).join('\n')}\n\nView in dashboard: https://unalabs.cloud/login?redirect=/dashboard\n\nQuestions? Reply here or email hello@unalabs.cloud\n\nUna Labs · unalabs.cloud`,
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
            TextPart: `New scope generated\n\nCompany: ${company}\nPlan: ${activation.tier}\nEmail: ${activation.email}\n\nMilestones:\n${milestones.map((m) => `• ${m.title}`).join('\n')}\n\nProject ID: ${projectId}`,
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
  const tier = session.metadata?.tier ?? intake.plan ?? '';
  const billing = session.metadata?.billing ?? intake.billing ?? '';
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

  // Generate and write project scope
  if (projectWrite.projectId) {
    try {
      await generateAndWriteScope(projectWrite.projectId, intake, activation, env);
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
  const plan = sanitize(body.plan) || 'professional';
  const billing = sanitize(body.billing) || 'monthly';

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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin');

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (req.method === 'GET' && url.pathname === '/api/checkout-success') {
      return handleCheckoutSuccess(req, env);
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, origin);
    }

    switch (url.pathname) {
      case '/api/create-checkout-session':
        return handleCreateCheckoutSession(req, env, origin);
      case '/api/activate-project':
        return handleActivateProject(req, env, origin);
      case '/api/contracts/ensure':
        return handleEnsureContract(req, env, origin);
      case '/api/contracts/sign':
        return handleSignContract(req, env, origin);
      case '/api/subscribe':
        return handleSubscribe(req, env, origin);
      case '/api/milestone-action':
        return handleMilestoneAction(req, env, origin);
      case '/api/intake-confirm':
        return handleIntakeConfirm(req, env, origin);
      case '/api/admin/billing':
        return handleAdminBilling(req, env, origin);
      case '/api/admin/subscription-action':
        return handleAdminSubscriptionAction(req, env, origin);
      default:
        return json({ error: 'Not found.' }, 404, origin);
    }
  },
};
