'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { STRIPE_API_URL } from '@/lib/stripe-config';
import { ACTIVATION_BANDS, getCommercialBillingLabel, getCommercialLabel, isActivationCommercial } from '@/lib/service-engagement';

type Project = {
  id: string;
  email?: string;
  name?: string;
  description?: string;
  tier?: string;
  billing?: string;
  status?: string;
  intake_id?: string;
  stripe_session_id?: string;
  ai_price_min_cad?: number | null;
  ai_price_max_cad?: number | null;
  ai_price_rationale?: string | null;
  ai_price_confidence?: string | null;
  ai_price_generated_at?: string | null;
  connect_account_id?: string | null;
  connect_onboarding_complete?: boolean | null;
  connect_details_submitted?: boolean | null;
  connect_charges_enabled?: boolean | null;
  connect_payouts_enabled?: boolean | null;
  connect_last_synced_at?: string | null;
  created_at?: string;
};

type Milestone = {
  id: string;
  project_id: string;
  title?: string;
  status?: string;
  due_date?: string;
  completed_at?: string;
  proof_url?: string;
  proof_note?: string;
};

type Subscriber = {
  id: string;
  email: string;
  created_at: string;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  message?: string | null;
  source: string;
  status: string;
  notes?: string | null;
  created_at: string;
};

type Contract = {
  id: string;
  project_id: string;
  title?: string;
  status?: string;
  sent_at?: string;
  signer_name?: string;
  signer_email?: string;
  signed_at?: string;
  created_at?: string;
};

type Invoice = {
  id: string;
  project_id: string;
  milestone_id: string;
  invoice_number: string;
  title?: string;
  amount_cad?: number;
  status?: string;
  due_date?: string;
  paid_at?: string;
  client_email?: string;
  created_at?: string;
};

type InstantBill = {
  id: string;
  project_id: string;
  stripe_payment_link_id: string;
  stripe_price_id: string;
  amount_cad?: number;
  description?: string;
  payment_link_url?: string;
  status?: string;
  paid_at?: string;
  created_at?: string;
};

type AutoCollectItem = {
  id: string;
  invoice_id: string;
  project_id: string;
  client_email: string;
  invoice_number: string;
  amount_cad?: number;
  due_date?: string;
  status?: string;
  attempts?: number;
  last_invited_at?: string | null;
  created_at?: string;
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

type BillingInfo = {
  subscription_id: string | null;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  pause_collection: boolean;
  trial_end: number | null;
};

type State =
  | { phase: 'loading' }
  | { phase: 'denied'; reason: 'unauthenticated' | 'unauthorized' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; projects: Project[]; milestones: Milestone[]; subscribers: Subscriber[]; contracts: Contract[]; invoices: Invoice[]; instantBills: InstantBill[]; leads: Lead[] };

const ADMIN_EMAIL = 'mike.fejiro@gmail.com';

const TIER_PRICE: Record<string, number> = {
  starter: 67,
  professional: 135,
  agency: 339,
  enterprise: 679,
  founding_pilot_activation: 67,
  simple_activation: 250,
  standard_activation: 500,
  complex_activation: 1000,
};

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-blue-100 text-blue-700',
  scoped: 'bg-purple-100 text-purple-700',
  awaiting_approval: 'bg-amber-100 text-amber-700',
  active: 'bg-orange-100 text-orange-700',
  review: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-teal-100 text-teal-700',
  paused: 'bg-gray-100 text-gray-500',
  support: 'bg-emerald-100 text-emerald-700',
};

const PIPELINE_STAGES = ['intake', 'scoped', 'awaiting_approval', 'active', 'review', 'complete', 'paused', 'support'] as const;

const BILLING_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-500',
  unpaid: 'bg-red-100 text-red-700',
  incomplete: 'bg-yellow-100 text-yellow-700',
  paused: 'bg-orange-100 text-orange-600',
  no_subscription: 'bg-gray-50 text-gray-400',
  error: 'bg-gray-50 text-gray-400',
};

function billingLabel(info: BillingInfo): string {
  if (info.pause_collection) return 'paused';
  if (info.cancel_at_period_end) return 'canceling';
  return info.status;
}

function billingColor(info: BillingInfo): string {
  if (info.pause_collection) return BILLING_STATUS_COLORS.paused;
  if (info.cancel_at_period_end) return 'bg-amber-100 text-amber-700';
  return BILLING_STATUS_COLORS[info.status] ?? 'bg-gray-50 text-gray-400';
}

function formatUnix(ts: number | null): string {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function formatPriceRange(min?: number | null, max?: number | null) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return `CA$${Number(min).toLocaleString('en-CA')} - CA$${Number(max).toLocaleString('en-CA')}`;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-3xl font-bold text-tx-heading">{value}</p>
      {sub && <p className="text-body-sm text-tx-secondary mt-1">{sub}</p>}
    </div>
  );
}

const DASHBOARD_REFRESH_INTERVAL_MS = 60_000;

const OPS_QUICK_LINKS = [
  { label: 'Realtor entry point', href: '/realtor', description: 'Open the vertical intake flow now live on the site.' },
  { label: 'Client portal', href: '/portal', description: 'View the client-facing progress surface.' },
  { label: 'Proposal view', href: '/dashboard/proposal', description: 'Open the shareable scope and pricing surface.' },
  { label: 'Reporting view', href: '/dashboard/report', description: 'Open the client-ready reporting surface.' },
];

export function AdminClient() {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [view, setView] = useState<'pipeline' | 'table'>('pipeline');
  const [billing, setBilling] = useState<Record<string, BillingInfo>>({});
  const [billingLoading, setBillingLoading] = useState(false);
  const [autoCollectItems, setAutoCollectItems] = useState<AutoCollectItem[]>([]);
  const [autoCollectHealth, setAutoCollectHealth] = useState<AutoCollectHealth | null>(null);
  const [autoCollectLoading, setAutoCollectLoading] = useState(false);
  const [autoCollectSyncing, setAutoCollectSyncing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const [brandingProjectId, setBrandingProjectId] = useState('');
  const [brandingForm, setBrandingForm] = useState({ companyName: '', primaryColor: '#4DB8A8', logoUrl: '', tagline: '', replyEmail: '' });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaveMsg, setBrandingSaveMsg] = useState<string | null>(null);

  // Phase 15: Webhooks
  type WebhookEndpoint = { id: string; url: string; events: string[]; created_at: string };
  const WEBHOOK_EVENT_OPTIONS = ['project.created', 'proposal.sent', 'payment.received', 'milestone.approved'] as const;
  const [webhookProjectId, setWebhookProjectId] = useState('');
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [webhookAdding, setWebhookAdding] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  // Phase 14: Stripe Connect
  type ConnectStatus = {
    connected: boolean;
    project: Project;
  };
  const [connectProjectId, setConnectProjectId] = useState('');
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);

  const [instantBillProjectId, setInstantBillProjectId] = useState('');
  const [instantBillAmount, setInstantBillAmount] = useState('');
  const [instantBillDescription, setInstantBillDescription] = useState('');
  const [instantBillCreating, setInstantBillCreating] = useState(false);
  const [instantBillLink, setInstantBillLink] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [projectActionLoading, setProjectActionLoading] = useState<string | null>(null);
  const [conciergeSubmitting, setConciergeSubmitting] = useState(false);
  const [conciergeMessage, setConciergeMessage] = useState<string | null>(null);
  const [conciergePreview, setConciergePreview] = useState<{
    summary?: string;
    problem_statement?: string;
    solution_direction?: string;
    activation_band?: string;
    pricing?: { suggested_min_cad?: number; suggested_max_cad?: number; confidence?: string } | null;
  } | null>(null);
  const [conciergeForm, setConciergeForm] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    project_title: '',
    transcript: '',
    activation_band_override: 'standard_activation',
  });

  async function refreshAutoCollect(accessToken?: string, options?: { silent?: boolean }) {
    if (!options?.silent) setAutoCollectLoading(true);
    try {
      const headers = {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };
      const [queueRes, healthRes] = await Promise.all([
        fetch(`${STRIPE_API_URL}/api/admin/autocollect?limit=100`, { method: 'GET', headers }),
        fetch(`${STRIPE_API_URL}/api/admin/autocollect/health`, { method: 'GET', headers }),
      ]);

      const queuePayload = await queueRes.json() as { items?: AutoCollectItem[]; error?: string };
      if (queueRes.ok) {
        setAutoCollectItems(queuePayload.items ?? []);
      }

      const healthPayload = await healthRes.json() as { health?: AutoCollectHealth; error?: string };
      if (healthRes.ok) {
        setAutoCollectHealth(healthPayload.health ?? null);
      }
    } catch {
      // Non-fatal for admin page.
    }
    if (!options?.silent) setAutoCollectLoading(false);
  }

  async function loadDashboardData(options?: { silent?: boolean }) {
    const silent = options?.silent === true;
    if (!silent) setRefreshing(true);

    try {
      const [{ getSession }, { createBrowserClient }] = await Promise.all([
        import('@ftc/auth'),
        import('@ftc/supabase'),
      ]);
      const session = await getSession();
      if (!session?.user) {
        setState({ phase: 'denied', reason: 'unauthenticated' });
        return;
      }
      if (session.user.email !== ADMIN_EMAIL) {
        setState({ phase: 'denied', reason: 'unauthorized' });
        return;
      }

      const client = createBrowserClient();
      const accessToken = session.access_token ?? '';
      setStoredToken(accessToken);
      const [
        { data: projects, error: projectError },
        { data: milestones, error: milestoneError },
        { data: subscribers, error: subscriberError },
        { data: contracts, error: contractError },
        { data: invoices, error: invoiceError },
        { data: instantBills, error: instantBillsError },
        leadsRes,
      ] = await Promise.all([
        client.from('projects').select('*').order('created_at', { ascending: false }),
        client.from('milestones').select('*').order('due_date', { ascending: true }),
        client.from('subscribers').select('*').order('created_at', { ascending: false }),
        client.from('contracts').select('id,project_id,title,status,sent_at,signer_name,signer_email,signed_at,created_at').order('created_at', { ascending: false }),
        client.from('invoices').select('*').order('created_at', { ascending: false }),
        client.from('instant_bills').select('*').order('created_at', { ascending: false }),
        fetch(`${STRIPE_API_URL}/api/admin/leads?limit=100`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);

      if (projectError) throw projectError;
      if (milestoneError) throw milestoneError;
      if (subscriberError) throw subscriberError;
      if (contractError) throw contractError;
      if (invoiceError) throw invoiceError;
      if (instantBillsError) throw instantBillsError;

      const leadsPayload = leadsRes.ok ? await leadsRes.json() as { leads?: Lead[] } : { leads: [] };
      setLeads(leadsPayload.leads ?? []);

      setState({
        phase: 'ready',
        projects: (projects as Project[] | null) ?? [],
        milestones: (milestones as Milestone[] | null) ?? [],
        subscribers: (subscribers as Subscriber[] | null) ?? [],
        contracts: (contracts as Contract[] | null) ?? [],
        invoices: (invoices as Invoice[] | null) ?? [],
        instantBills: (instantBills as InstantBill[] | null) ?? [],
        leads: leadsPayload.leads ?? [],
      });

      const projectList = (projects as Project[] | null) ?? [];
      const sessionIds = projectList
        .map((p) => p.stripe_session_id)
        .filter((id): id is string => Boolean(id));

      if (sessionIds.length > 0) {
        setBillingLoading(true);
        try {
          const token = session.access_token;
          const res = await fetch(`${STRIPE_API_URL}/api/admin/billing`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ stripe_session_ids: sessionIds }),
          });
          if (res.ok) {
            const data = await res.json() as { billing: Record<string, BillingInfo> };
            setBilling(data.billing);
          }
        } catch {
          // Non-fatal.
        }
        setBillingLoading(false);
      }

      await refreshAutoCollect(session.access_token, { silent });
      setLastRefreshedAt(new Date().toISOString());
    } catch (error) {
      setState({ phase: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
    const intervalId = window.setInterval(() => {
      void loadDashboardData({ silent: true });
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  async function handleStatusChange(projectId: string, newStatus: string) {
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();
      const response = await fetch(`${STRIPE_API_URL}/api/admin/projects/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ project_id: projectId, status: newStatus }),
      });
      const payload = await response.json() as { project?: Project; error?: string };
      if (!response.ok || !payload.project) {
        alert(payload.error ?? 'Failed to update project status.');
        return;
      }
      setState((prev) => {
        if (prev.phase !== 'ready') return prev;
        return {
          ...prev,
          projects: prev.projects.map((project) => (project.id === projectId ? { ...project, ...payload.project } : project)),
        };
      });
    } catch {
      alert('Network error while updating project status.');
    }
  }

  async function handleCreateConciergeDraft() {
    if (!conciergeForm.email || !conciergeForm.project_title || !conciergeForm.transcript.trim()) {
      alert('Client email, project title, and intake notes are required.');
      return;
    }

    setConciergeSubmitting(true);
    setConciergeMessage(null);
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();
      const response = await fetch(`${STRIPE_API_URL}/api/admin/intake-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(conciergeForm),
      });

      const payload = await response.json() as {
        ok?: boolean;
        error?: string;
        project?: Project;
        milestones?: Milestone[];
        draft?: {
          summary?: string;
          problem_statement?: string;
          solution_direction?: string;
          activation_band?: string;
          pricing?: { suggested_min_cad?: number; suggested_max_cad?: number; confidence?: string } | null;
        };
      };

      if (!response.ok || !payload.ok || !payload.project) {
        alert(payload.error ?? 'Failed to create concierge intake draft.');
        return;
      }

      setState((prev) => {
        if (prev.phase !== 'ready') return prev;
        return {
          ...prev,
          projects: [payload.project!, ...prev.projects],
          milestones: [...(payload.milestones ?? []), ...prev.milestones],
        };
      });
      setConciergePreview(payload.draft ?? null);
      setConciergeMessage('Concierge draft created. Review it below, then publish when ready.');
      setConciergeForm({
        name: '',
        email: '',
        company: '',
        role: '',
        project_title: '',
        transcript: '',
        activation_band_override: conciergeForm.activation_band_override,
      });
    } catch {
      alert('Network error while creating concierge draft.');
    } finally {
      setConciergeSubmitting(false);
    }
  }

  async function handlePublishScope(projectId: string) {
    setProjectActionLoading(projectId);
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();
      const response = await fetch(`${STRIPE_API_URL}/api/admin/projects/publish-scope`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      const payload = await response.json() as { ok?: boolean; project?: Project; error?: string };
      if (!response.ok || !payload.ok || !payload.project) {
        alert(payload.error ?? 'Failed to publish scoped plan.');
        return;
      }

      setState((prev) => {
        if (prev.phase !== 'ready') return prev;
        return {
          ...prev,
          projects: prev.projects.map((project) => (project.id === projectId ? { ...project, ...payload.project } : project)),
        };
      });
      setConciergeMessage('Scope published to client portal. Engagement letter is ready for signature.');
    } catch {
      alert('Network error while publishing scope.');
    } finally {
      setProjectActionLoading(null);
    }
  }

  async function handleBillingAction(sessionId: string, subscriptionId: string, action: 'pause' | 'resume' | 'cancel') {
    if (action === 'cancel' && !confirm('Cancel this subscription at period end?')) return;
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();
      const token = session?.access_token;
      const res = await fetch(`${STRIPE_API_URL}/api/admin/subscription-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subscription_id: subscriptionId, action }),
      });
      const data = await res.json() as { ok?: boolean; subscription?: BillingInfo; error?: string };
      if (!res.ok || !data.ok) {
        alert(data.error ?? 'Action failed.');
        return;
      }
      if (data.subscription) {
        setBilling((prev) => ({ ...prev, [sessionId]: data.subscription as BillingInfo }));
      }
    } catch {
      alert('Network error.');
    }
  }

  async function handleCreateInstantBill() {
    if (state.phase !== 'ready') return;
    const amount = Number(instantBillAmount);
    const minAmountCad = 0.5;

    if (!instantBillProjectId) {
      alert('Select a project first.');
      return;
    }
    if (!Number.isFinite(amount) || amount < minAmountCad) {
      alert('Enter a valid amount. Stripe minimum is CA$0.50.');
      return;
    }
    if (!instantBillDescription.trim()) {
      alert('Add a short description.');
      return;
    }

    setInstantBillCreating(true);
    setInstantBillLink(null);
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();
      const token = session?.access_token;

      const response = await fetch(`${STRIPE_API_URL}/api/admin/instant-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: instantBillProjectId,
          amount_cad: Number(amount.toFixed(2)),
          description: instantBillDescription.trim(),
        }),
      });

      const payload = await response.json() as {
        ok?: boolean;
        error?: string;
        instant_bill?: InstantBill;
        payment_link_url?: string;
      };

      if (!response.ok || !payload.ok || !payload.instant_bill) {
        alert(payload.error ?? 'Failed to create instant bill.');
        return;
      }

      setInstantBillLink(payload.payment_link_url ?? payload.instant_bill.payment_link_url ?? null);
      setInstantBillAmount('');
      setInstantBillDescription('');

      setState((prev) => {
        if (prev.phase !== 'ready') return prev;
        return {
          ...prev,
          instantBills: [payload.instant_bill!, ...prev.instantBills],
        };
      });
    } catch {
      alert('Network error while creating instant bill.');
    } finally {
      setInstantBillCreating(false);
    }
  }

  async function handleAutoCollectSync() {
    setAutoCollectSyncing(true);
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();

      const res = await fetch(`${STRIPE_API_URL}/api/admin/autocollect/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ overdue_only: true, limit: 100 }),
      });
      const payload = await res.json() as { error?: string; items?: AutoCollectItem[]; synced?: number };
      if (!res.ok) {
        alert(payload.error ?? 'Failed to sync AutoCollect queue.');
        return;
      }
      if (payload.items) setAutoCollectItems(payload.items);
      await refreshAutoCollect(session?.access_token);
    } catch {
      alert('Network error while syncing AutoCollect queue.');
    }
    setAutoCollectSyncing(false);
  }

  async function handleAutoCollectSendInvite(id: string) {
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();

      const res = await fetch(`${STRIPE_API_URL}/api/admin/autocollect/send-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ id }),
      });

      const payload = await res.json() as { item?: AutoCollectItem; error?: string };
      if (!res.ok || !payload.item) {
        alert(payload.error ?? 'Failed to send payment invite.');
        return;
      }

      setAutoCollectItems((prev) => prev.map((item) => (item.id === id ? payload.item! : item)));
    } catch {
      alert('Network error while sending payment invite.');
    }
  }

  async function handleUpdateLeadStatus(id: string, status: string) {
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();

      const res = await fetch(`${STRIPE_API_URL}/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });

      const payload = await res.json() as { lead?: Lead; error?: string };
      if (!res.ok || !payload.lead) {
        alert(payload.error ?? 'Failed to update lead.');
        return;
      }

      setLeads((prev) => prev.map((lead) => (lead.id === id ? payload.lead! : lead)));
    } catch {
      alert('Network error while updating lead.');
    }
  }

  async function handleLoadBranding(id: string) {
    if (!id || !storedToken) return;
    try {
      const res = await fetch(`${STRIPE_API_URL}/api/admin/branding/${id}`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const data = await res.json() as { branding?: { companyName?: string; primaryColor?: string; logoUrl?: string; tagline?: string; replyEmail?: string } | null };
      const b = data.branding ?? {};
      setBrandingForm({
        companyName: b.companyName ?? '',
        primaryColor: b.primaryColor ?? '#4DB8A8',
        logoUrl: b.logoUrl ?? '',
        tagline: b.tagline ?? '',
        replyEmail: b.replyEmail ?? '',
      });
    } catch { /* silent */ }
  }

  async function handleSaveBranding() {
    if (!brandingProjectId || !storedToken) return;
    setBrandingSaving(true);
    setBrandingSaveMsg(null);
    try {
      const res = await fetch(`${STRIPE_API_URL}/api/admin/branding/${brandingProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedToken}` },
        body: JSON.stringify(brandingForm),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      setBrandingSaveMsg(data.ok ? 'Branding saved.' : (data.error ?? 'Failed to save.'));
      window.setTimeout(() => setBrandingSaveMsg(null), 3000);
    } catch {
      setBrandingSaveMsg('Network error.');
    }
    setBrandingSaving(false);
  }

  async function handleLoadWebhooks(id: string) {
    if (!id || !storedToken) return;
    setWebhooks([]);
    try {
      const res = await fetch(`${STRIPE_API_URL}/api/admin/webhooks/${id}`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const data = await res.json() as { endpoints?: WebhookEndpoint[] };
      setWebhooks(data.endpoints ?? []);
    } catch { /* silent */ }
  }

  async function handleAddWebhook() {
    if (!webhookProjectId || !storedToken || !webhookUrl) return;
    setWebhookAdding(true);
    setWebhookMsg(null);
    setNewWebhookSecret(null);
    try {
      const res = await fetch(`${STRIPE_API_URL}/api/admin/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedToken}` },
        body: JSON.stringify({ project_id: webhookProjectId, url: webhookUrl, events: webhookEvents }),
      });
      const data = await res.json() as { ok?: boolean; endpoint?: WebhookEndpoint & { secret?: string }; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Failed');
      setWebhooks((prev) => [...prev, data.endpoint!]);
      setNewWebhookSecret(data.endpoint?.secret ?? null);
      setWebhookUrl('');
      setWebhookEvents([]);
      setWebhookMsg('Endpoint registered.');
    } catch (e) {
      setWebhookMsg(e instanceof Error ? e.message : 'Failed to register endpoint.');
    }
    setWebhookAdding(false);
  }

  async function handleDeleteWebhook(id: string) {
    if (!storedToken) return;
    try {
      await fetch(`${STRIPE_API_URL}/api/admin/webhooks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setWebhooks((prev) => prev.filter((ep) => ep.id !== id));
    } catch { /* silent */ }
  }

  async function handleLoadConnectStatus(id: string) {
    if (!id || !storedToken) return;
    setConnectLoading(true);
    setConnectMsg(null);
    setConnectStatus(null);
    try {
      const res = await fetch(`${STRIPE_API_URL}/api/admin/connect/${id}`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const data = await res.json() as { connected?: boolean; project?: Project; error?: string };
      if (!res.ok || !data.project) {
        throw new Error(data.error ?? 'Failed to load Connect status.');
      }
      setConnectStatus({ connected: Boolean(data.connected), project: data.project });
    } catch (error) {
      setConnectMsg(error instanceof Error ? error.message : 'Failed to load Connect status.');
    }
    setConnectLoading(false);
  }

  async function handleStartConnectOnboarding() {
    if (!connectProjectId || !storedToken) return;
    setConnectLoading(true);
    setConnectMsg(null);
    try {
      const res = await fetch(`${STRIPE_API_URL}/api/admin/connect/${connectProjectId}/onboard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const data = await res.json() as { onboarding_url?: string; error?: string };
      if (!res.ok || !data.onboarding_url) {
        throw new Error(data.error ?? 'Failed to start onboarding.');
      }
      window.open(data.onboarding_url, '_blank', 'noopener,noreferrer');
      setConnectMsg('Onboarding link opened in a new tab. Refresh status after completion.');
      await handleLoadConnectStatus(connectProjectId);
    } catch (error) {
      setConnectMsg(error instanceof Error ? error.message : 'Failed to start onboarding.');
    }
    setConnectLoading(false);
  }

  async function handleOpenConnectDashboard() {
    if (!connectProjectId || !storedToken) return;
    setConnectLoading(true);
    setConnectMsg(null);
    try {
      const res = await fetch(`${STRIPE_API_URL}/api/admin/connect/${connectProjectId}/dashboard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const data = await res.json() as { dashboard_url?: string; error?: string };
      if (!res.ok || !data.dashboard_url) {
        throw new Error(data.error ?? 'Dashboard link unavailable.');
      }
      window.open(data.dashboard_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setConnectMsg(error instanceof Error ? error.message : 'Failed to open dashboard link.');
    }
    setConnectLoading(false);
  }

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  if (state.phase === 'denied') {
    const isUnauthenticated = state.reason === 'unauthenticated';
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <Badge variant="muted">{isUnauthenticated ? 'Sign in required' : 'Access denied'}</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Admin only</h1>
          <p className="mt-3 text-body text-tx-secondary">
            {isUnauthenticated
              ? 'You need to sign in to access this page.'
              : 'This page is restricted to the site administrator.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 items-center">
            {isUnauthenticated && (
              <Button href="/login?redirect=/admin" variant="primary" size="md">Sign in</Button>
            )}
            <Button href="/" variant="secondary" size="md">Go home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center px-6">
        <p className="text-body text-red-500">{state.message}</p>
      </div>
    );
  }

  const { projects, milestones, subscribers, contracts, invoices, instantBills } = state;

  const totalMRR = projects
    .filter((project) => !['paused', 'complete'].includes(project.status ?? '') && !isActivationCommercial(project.tier))
    .reduce((sum, project) => sum + (TIER_PRICE[project.tier?.toLowerCase() ?? ''] ?? 0), 0);

  const byStatus = projects.reduce<Record<string, number>>((accumulator, project) => {
    const status = project.status ?? 'intake';
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});

  const milestonesByProject = milestones.reduce<Record<string, Milestone[]>>((map, milestone) => {
    if (!map[milestone.project_id]) map[milestone.project_id] = [];
    map[milestone.project_id].push(milestone);
    return map;
  }, {});

  const needsApproval = projects.filter((project) =>
    (milestonesByProject[project.id] ?? []).some((milestone) => milestone.status === 'review')
  );
  const realtorProjects = projects.filter((project) => (project.intake_id ?? '').startsWith('realtor_')).length;
  const collectionEscalations = autoCollectItems.filter((item) => (item.attempts ?? 0) >= 3).length;
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid').length;

  return (
    <section className="bg-bg-offwhite min-h-screen">
      <div className="max-w-content mx-auto px-6 pt-14 pb-24">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <Badge variant="teal">Admin</Badge>
            <h1 className="mt-3 text-display-sm text-tx-heading">Una Labs - Reporting</h1>
            <p className="mt-1 text-body text-tx-muted">Live operating view for projects, billing, collections, and realtor intake.</p>
            <p className="mt-2 text-[11px] text-tx-muted">Auto-refreshes every 60 seconds{lastRefreshedAt ? ` · Last refreshed ${formatDate(lastRefreshedAt)}` : ''}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="secondary" size="md" onClick={() => void loadDashboardData()} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh now'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={async () => {
                const { signOut } = await import('@ftc/auth');
                await signOut();
                window.location.href = '/login';
              }}
            >
              Sign out
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-[28px] border border-border shadow-sm p-8 mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <Badge variant="orange">Ops Command Center</Badge>
              <h2 className="mt-3 text-h2 text-tx-heading">One screen for live operating state</h2>
              <p className="mt-2 text-body text-tx-secondary max-w-3xl">This page is the realtime founder board: it polls Supabase and the billing worker, keeps collection pressure visible, and gives you fast access to the public routes clients actually touch.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Stat label="Realtor projects" value={realtorProjects} sub="intake_id starts with realtor_" />
            <Stat label="Paid invoices" value={paidInvoices} sub={`${invoices.length} total invoices`} />
            <Stat label="Collection escalations" value={collectionEscalations} sub="3+ reminders already sent" />
            <Stat label="Auto updates" value="On" sub="dashboard polling + scheduled doc sync" />
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {OPS_QUICK_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="rounded-2xl border border-border bg-bg-offwhite p-5 hover:border-brand-teal/50 transition-colors">
                <p className="text-body font-semibold text-tx-heading">{link.label}</p>
                <p className="mt-2 text-body-sm text-tx-secondary">{link.description}</p>
                <p className="mt-3 text-[11px] font-semibold text-brand-teal">Open route →</p>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[28px] border border-border shadow-sm p-8 mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <Badge variant="teal">Concierge Onboarding</Badge>
              <h2 className="mt-3 text-h3 text-tx-heading">Turn an intake call into a scoped project</h2>
              <p className="mt-2 text-body text-tx-secondary max-w-3xl">Paste your call notes or transcript here to create the project record, generate the first scope draft, and hold it in internal review until you publish it.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.4fr_.9fr] gap-6">
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-2">Client name</label>
                  <input value={conciergeForm.name} onChange={(e) => setConciergeForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" placeholder="e.g. David Jumbo" />
                </div>
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-2">Client email</label>
                  <input value={conciergeForm.email} onChange={(e) => setConciergeForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" placeholder="client@example.com" />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-2">Company</label>
                  <input value={conciergeForm.company} onChange={(e) => setConciergeForm((prev) => ({ ...prev, company: e.target.value }))} className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" placeholder="Client company" />
                </div>
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-2">Role</label>
                  <input value={conciergeForm.role} onChange={(e) => setConciergeForm((prev) => ({ ...prev, role: e.target.value }))} className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" placeholder="Founder / Ops / Sales" />
                </div>
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-2">Activation band</label>
                  <select value={conciergeForm.activation_band_override} onChange={(e) => setConciergeForm((prev) => ({ ...prev, activation_band_override: e.target.value }))} className="w-full text-body-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-border-focus">
                    {ACTIVATION_BANDS.map((band) => (
                      <option key={band.id} value={band.id}>{band.label} - CA${band.price}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-body-sm font-semibold text-tx-heading mb-2">Project title</label>
                <input value={conciergeForm.project_title} onChange={(e) => setConciergeForm((prev) => ({ ...prev, project_title: e.target.value }))} className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" placeholder="Client portal, AI qualification flow, mobile app, etc." />
              </div>
              <div>
                <label className="block text-body-sm font-semibold text-tx-heading mb-2">Intake notes or transcript</label>
                <textarea value={conciergeForm.transcript} onChange={(e) => setConciergeForm((prev) => ({ ...prev, transcript: e.target.value }))} rows={10} className="w-full text-body-sm border border-border rounded-lg px-3 py-3 focus:outline-none focus:border-border-focus resize-y" placeholder="Paste the call transcript, structured notes, constraints, budget signals, and what the client wants solved." />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="primary" size="md" onClick={() => void handleCreateConciergeDraft()} disabled={conciergeSubmitting}>
                  {conciergeSubmitting ? 'Creating draft...' : 'Create concierge draft'}
                </Button>
                {conciergeMessage && <p className="text-body-sm text-tx-secondary">{conciergeMessage}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-bg-offwhite p-5">
              <p className="text-body-sm font-semibold text-tx-heading mb-2">Latest draft preview</p>
              {conciergePreview ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-tx-muted font-semibold">Summary</p>
                    <p className="mt-1 text-body-sm text-tx-body leading-relaxed">{conciergePreview.summary}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-tx-muted font-semibold">Problem statement</p>
                    <p className="mt-1 text-body-sm text-tx-body leading-relaxed">{conciergePreview.problem_statement}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-tx-muted font-semibold">Solution direction</p>
                    <p className="mt-1 text-body-sm text-tx-body leading-relaxed">{conciergePreview.solution_direction}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-tx-muted font-semibold">Commercial guidance</p>
                    <p className="mt-1 text-body-sm text-tx-body">
                      {conciergePreview.activation_band ? getCommercialLabel(conciergePreview.activation_band) : 'Activation band pending'}
                      {conciergePreview.pricing?.suggested_min_cad && conciergePreview.pricing?.suggested_max_cad
                        ? ` - CA$${Number(conciergePreview.pricing.suggested_min_cad).toLocaleString('en-CA')} - CA$${Number(conciergePreview.pricing.suggested_max_cad).toLocaleString('en-CA')}`
                        : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-body-sm text-tx-muted">Create a concierge draft to preview the generated scope summary here.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <Stat label="Total projects" value={projects.length} />
          <Stat label="Est. MRR" value={`CA$${totalMRR.toLocaleString('en-CA')}`} sub="Active plans only" />
          <Stat label="Needs approval" value={needsApproval.length} sub="Milestones in review" />
          <Stat label="Subscribers" value={subscribers.length} sub="Newsletter list" />
          <Stat label="Contracts signed" value={contracts.filter((c) => c.status === 'signed').length} sub={`${contracts.length} total sent`} />
          <Stat label="Unpaid invoices" value={invoices.filter((invoice) => invoice.status === 'unpaid').length} sub={`${invoices.length} total`} />
          <Stat label="AutoCollect queue" value={autoCollectItems.length} sub="Overdue follow-ups" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-10">
          {(['intake', 'scoped', 'awaiting_approval', 'active', 'review', 'complete', 'paused', 'support'] as const).map((status) => (
            <div key={status} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between">
              <span className="text-body-sm text-tx-secondary capitalize">{status}</span>
              <span className={`text-body-sm font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                {byStatus[status] ?? 0}
              </span>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-xl text-body-sm font-semibold transition-colors ${view === 'pipeline' ? 'bg-brand-teal text-white' : 'bg-white text-tx-secondary border border-border hover:bg-bg-offwhite'}`}
            onClick={() => setView('pipeline')}
          >
            Pipeline
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-body-sm font-semibold transition-colors ${view === 'table' ? 'bg-brand-teal text-white' : 'bg-white text-tx-secondary border border-border hover:bg-bg-offwhite'}`}
            onClick={() => setView('table')}
          >
            Table
          </button>
        </div>

        {/* Pipeline view */}
        {view === 'pipeline' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {PIPELINE_STAGES.map((stage) => {
              const stageProjects = projects.filter((p) => (p.status ?? 'intake') === stage);
              return (
                <div key={stage} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className={`px-4 py-3 border-b border-border ${STATUS_COLORS[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm font-bold capitalize">{stage}</span>
                      <span className="text-[11px] font-bold rounded-full bg-white/60 px-1.5">{stageProjects.length}</span>
                    </div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {stageProjects.length === 0 ? (
                      <p className="text-[11px] text-tx-muted text-center py-6">&mdash;</p>
                    ) : (
                      stageProjects.map((project) => {
                        const pm = milestonesByProject[project.id] ?? [];
                        const done = pm.filter((m) => ['done', 'complete', 'completed', 'approved'].includes(m.status ?? '')).length;
                        const priceRange = formatPriceRange(project.ai_price_min_cad, project.ai_price_max_cad);
                        return (
                          <div key={project.id} className="bg-bg-offwhite rounded-xl border border-border p-3">
                            <p className="text-body-sm font-semibold text-tx-heading truncate">{project.name || project.email}</p>
                            {project.name && <p className="text-[11px] text-tx-muted truncate">{project.email}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {project.tier && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-teal/10 text-brand-teal">{getCommercialLabel(project.tier)}</span>
                              )}
                              {pm.length > 0 && (
                                <span className="text-[10px] text-tx-muted">{done}/{pm.length}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-tx-muted mt-1">{formatDate(project.created_at)}</p>
                            {priceRange && (
                              <p className="text-[10px] text-tx-secondary mt-1">
                                AI: {priceRange}
                                {project.ai_price_confidence ? ` (${project.ai_price_confidence})` : ''}
                              </p>
                            )}
                            <select
                              className="mt-2 w-full text-[11px] border border-border rounded-lg px-2 py-1.5 bg-white text-tx-body cursor-pointer"
                              value={project.status ?? 'intake'}
                              onChange={(e) => handleStatusChange(project.id, e.target.value)}
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                            {project.status === 'scoped' && (
                              <button
                                className="mt-2 w-full text-[10px] font-semibold px-2 py-1.5 rounded-lg bg-brand-teal text-white hover:bg-brand-teal/90 disabled:opacity-60"
                                onClick={() => void handlePublishScope(project.id)}
                                disabled={projectActionLoading === project.id}
                              >
                                {projectActionLoading === project.id ? 'Publishing...' : 'Publish scope'}
                              </button>
                            )}
                            {/* Billing status */}
                            {project.stripe_session_id && billing[project.stripe_session_id] && (() => {
                              const bi = billing[project.stripe_session_id!];
                              return (
                                <div className="mt-2">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${billingColor(bi)}`}>
                                    {billingLabel(bi)}
                                  </span>
                                  {bi.current_period_end && (
                                    <p className="text-[9px] text-tx-muted mt-0.5">ends {formatUnix(bi.current_period_end)}</p>
                                  )}
                                  {bi.subscription_id && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {!bi.pause_collection && bi.status === 'active' && (
                                        <button className="text-[9px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100" onClick={() => handleBillingAction(project.stripe_session_id!, bi.subscription_id!, 'pause')}>Pause</button>
                                      )}
                                      {bi.pause_collection && (
                                        <button className="text-[9px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100" onClick={() => handleBillingAction(project.stripe_session_id!, bi.subscription_id!, 'resume')}>Resume</button>
                                      )}
                                      {!bi.cancel_at_period_end && ['active', 'trialing'].includes(bi.status) && (
                                        <button className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100" onClick={() => handleBillingAction(project.stripe_session_id!, bi.subscription_id!, 'cancel')}>Cancel</button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table view */}
        {view === 'table' && (
        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden mb-10">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-h3 text-tx-heading">All Projects</h2>
            <span className="text-body-sm text-tx-muted">{projects.length} total</span>
          </div>
          {projects.length === 0 ? (
            <div className="px-8 py-10 text-center text-body text-tx-muted">No projects yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Client', 'Plan', 'Billing', 'Status', 'AI Price', 'Subscription', 'Milestones', 'Started'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, index) => {
                    const projectMilestones = milestonesByProject[project.id] ?? [];
                    const done = projectMilestones.filter((milestone) => ['done', 'complete', 'completed', 'approved'].includes(milestone.status ?? '')).length;
                    const hasReview = projectMilestones.some((milestone) => milestone.status === 'review');

                    return (
                      <tr key={project.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${index % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-tx-heading">{project.name || project.email}</p>
                          {project.name && <p className="text-tx-muted text-[11px] mt-0.5">{project.email}</p>}
                          {project.intake_id && <p className="text-tx-muted text-[11px] mt-0.5">{project.intake_id}</p>}
                        </td>
                        <td className="px-6 py-4 text-tx-body">{project.tier ? getCommercialLabel(project.tier) : '-'}</td>
                        <td className="px-6 py-4 text-tx-body">{project.billing ? (getCommercialBillingLabel(project.billing) || 'One-time') : '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <select
                              className={`text-[11px] font-bold capitalize border border-border rounded-lg px-2 py-1 cursor-pointer ${STATUS_COLORS[project.status ?? 'intake']}`}
                              value={project.status ?? 'intake'}
                              onChange={(e) => handleStatusChange(project.id, e.target.value)}
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                            {project.status === 'scoped' && (
                              <button
                                className="text-[10px] px-2 py-1 rounded bg-brand-teal text-white hover:bg-brand-teal/90 disabled:opacity-60"
                                onClick={() => void handlePublishScope(project.id)}
                                disabled={projectActionLoading === project.id}
                              >
                                {projectActionLoading === project.id ? 'Publishing...' : 'Publish scope'}
                              </button>
                            )}
                            {hasReview && <span className="text-[10px] font-bold text-brand-orange">review</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-tx-body">
                          {(() => {
                            const priceRange = formatPriceRange(project.ai_price_min_cad, project.ai_price_max_cad);
                            if (!priceRange) return <span className="text-[11px] text-tx-muted">-</span>;
                            return (
                              <div>
                                <p className="text-[11px] font-semibold text-tx-heading">{priceRange}</p>
                                {project.ai_price_confidence && (
                                  <p className="text-[10px] text-tx-muted capitalize">{project.ai_price_confidence} confidence</p>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const bi = project.stripe_session_id ? billing[project.stripe_session_id] : undefined;
                            if (billingLoading && !bi) return <span className="text-[11px] text-tx-muted animate-pulse">...</span>;
                            if (!bi) return <span className="text-[11px] text-tx-muted">-</span>;
                            return (
                              <div>
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded capitalize ${billingColor(bi)}`}>
                                  {billingLabel(bi)}
                                </span>
                                {bi.current_period_end && (
                                  <p className="text-[10px] text-tx-muted mt-1">ends {formatUnix(bi.current_period_end)}</p>
                                )}
                                {bi.subscription_id && (
                                  <div className="flex gap-1 mt-1.5 flex-wrap">
                                    {!bi.pause_collection && bi.status === 'active' && (
                                      <button className="text-[10px] px-2 py-0.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100" onClick={() => handleBillingAction(project.stripe_session_id!, bi.subscription_id!, 'pause')}>Pause</button>
                                    )}
                                    {bi.pause_collection && (
                                      <button className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100" onClick={() => handleBillingAction(project.stripe_session_id!, bi.subscription_id!, 'resume')}>Resume</button>
                                    )}
                                    {!bi.cancel_at_period_end && ['active', 'trialing'].includes(bi.status) && (
                                      <button className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100" onClick={() => handleBillingAction(project.stripe_session_id!, bi.subscription_id!, 'cancel')}>Cancel</button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-tx-body">
                          {projectMilestones.length > 0 ? `${done}/${projectMilestones.length}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-tx-muted">{formatDate(project.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* Invoices table */}
        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden mb-6">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-h3 text-tx-heading">Invoices</h2>
            <span className="text-body-sm text-tx-muted">{invoices.length} total</span>
          </div>
          {invoices.length === 0 ? (
            <div className="px-8 py-10 text-center text-body text-tx-muted">No invoices yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Client', 'Milestone', 'Invoice #', 'Amount', 'Status', 'Due', 'Created'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => {
                    const project = projects.find((p) => p.id === invoice.project_id);
                    const milestone = milestones.find((m) => m.id === invoice.milestone_id);
                    const isPaid = invoice.status === 'paid';
                    return (
                      <tr key={invoice.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${index % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-tx-heading">{project?.name || invoice.client_email || '-'}</p>
                          {project?.name && <p className="text-tx-muted text-[11px] mt-0.5">{invoice.client_email}</p>}
                        </td>
                        <td className="px-6 py-4 text-tx-body">{milestone?.title ?? invoice.title ?? '-'}</td>
                        <td className="px-6 py-4 font-mono text-tx-body">{invoice.invoice_number}</td>
                        <td className="px-6 py-4 text-tx-body">CA${invoice.amount_cad?.toLocaleString('en-CA') ?? '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${
                            isPaid ? 'bg-teal-100 text-teal-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {isPaid ? 'paid' : 'unpaid'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-tx-muted">{formatDate(invoice.due_date)}</td>
                        <td className="px-6 py-4 text-tx-muted">{formatDate(invoice.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instant Bill */}
        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden mb-6">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-h3 text-tx-heading">Instant Bill</h2>
            <span className="text-body-sm text-tx-muted">{instantBills.length} sent</span>
          </div>

          <div className="px-8 py-6 border-b border-border grid gap-3 md:grid-cols-[1.5fr_1fr_2fr_auto] items-end">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-tx-muted">Client project</label>
              <select
                value={instantBillProjectId}
                onChange={(event) => setInstantBillProjectId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-body-sm bg-white"
              >
                <option value="">Select project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name || project.email || project.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-tx-muted">Amount (CAD)</label>
              <input
                type="number"
                min="0.5"
                step="0.01"
                value={instantBillAmount}
                onChange={(event) => setInstantBillAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-body-sm"
                placeholder="250.00"
              />
              <p className="mt-1 text-[11px] text-tx-muted">Stripe minimum charge is CA$0.50. Tax is excluded for instant bills.</p>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-tx-muted">Description</label>
              <input
                value={instantBillDescription}
                onChange={(event) => setInstantBillDescription(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-body-sm"
                placeholder="One-off scope expansion"
              />
            </div>

            <div>
              <Button variant="primary" size="sm" onClick={handleCreateInstantBill} disabled={instantBillCreating}>
                {instantBillCreating ? 'Creating...' : 'Create link'}
              </Button>
            </div>
          </div>

          {instantBillLink && (
            <div className="px-8 py-4 border-b border-border bg-brand-teal-light/30">
              <p className="text-body-sm text-tx-body">
                Link created:{' '}
                <a href={instantBillLink} target="_blank" rel="noreferrer" className="font-semibold text-brand-teal hover:underline break-all">
                  {instantBillLink}
                </a>
              </p>
            </div>
          )}

          {instantBills.length === 0 ? (
            <div className="px-8 py-8 text-center text-body text-tx-muted">No instant bills yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Client', 'Description', 'Amount', 'Status', 'Created', 'Link'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {instantBills.map((bill, index) => {
                    const project = projects.find((p) => p.id === bill.project_id);
                    return (
                      <tr key={bill.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${index % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                        <td className="px-6 py-4 font-medium text-tx-heading">{project?.name || project?.email || '-'}</td>
                        <td className="px-6 py-4 text-tx-body">{bill.description ?? '-'}</td>
                        <td className="px-6 py-4 text-tx-body">CA${bill.amount_cad?.toLocaleString('en-CA') ?? '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${bill.status === 'paid' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'}`}>
                            {bill.status ?? 'sent'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-tx-muted">{formatDate(bill.created_at)}</td>
                        <td className="px-6 py-4">
                          {bill.payment_link_url ? (
                            <a href={bill.payment_link_url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-brand-teal hover:underline">
                              Open
                            </a>
                          ) : (
                            <span className="text-[11px] text-tx-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AutoCollect */}
        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden mb-6">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-h3 text-tx-heading">AutoCollect</h2>
                <span className="text-body-sm text-tx-muted">{autoCollectItems.length} queued</span>
              </div>
              <p className="text-[11px] text-tx-muted mt-1">
                Daily worker run sends reminders every {autoCollectHealth?.reminder_interval_days ?? 3} days, up to {autoCollectHealth?.max_attempts ?? 3} attempts per invoice.
              </p>
              {autoCollectHealth && (
                <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-bg-offwhite text-tx-secondary">Sent today: {autoCollectHealth.sent_today}/{autoCollectHealth.daily_cap}</span>
                  <span className="px-2 py-0.5 rounded-full bg-bg-offwhite text-tx-secondary">Remaining budget: {autoCollectHealth.remaining_daily_budget}</span>
                  <span className="px-2 py-0.5 rounded-full bg-bg-offwhite text-tx-secondary">Per-run cap: {autoCollectHealth.max_send_per_run}</span>
                  <span className="px-2 py-0.5 rounded-full bg-bg-offwhite text-tx-secondary">Escalations: {autoCollectHealth.escalations}</span>
                </div>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={handleAutoCollectSync} disabled={autoCollectSyncing}>
              {autoCollectSyncing ? 'Syncing...' : 'Sync overdue invoices'}
            </Button>
          </div>

          {autoCollectLoading ? (
            <div className="px-8 py-8 text-center text-body text-tx-muted animate-pulse">Loading AutoCollect queue...</div>
          ) : autoCollectItems.length === 0 ? (
            <div className="px-8 py-8 text-center text-body text-tx-muted">No queued overdue invoices.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Client', 'Invoice #', 'Amount', 'Due', 'Status', 'Attempts', 'Last Invite', 'Action'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {autoCollectItems.map((item, index) => (
                    <tr key={item.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${index % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                      <td className="px-6 py-4 text-tx-heading font-medium">{item.client_email}</td>
                      <td className="px-6 py-4 font-mono text-tx-body">{item.invoice_number}</td>
                      <td className="px-6 py-4 text-tx-body">CA${item.amount_cad?.toLocaleString('en-CA') ?? '-'}</td>
                      <td className="px-6 py-4 text-tx-muted">{formatDate(item.due_date)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${item.status === 'invite_sent' ? 'bg-orange-100 text-orange-700' : item.status === 'paid' ? 'bg-teal-100 text-teal-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {item.status ?? 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-tx-body">{item.attempts ?? 0}</td>
                      <td className="px-6 py-4 text-tx-muted">{formatDate(item.last_invited_at ?? undefined)}</td>
                      <td className="px-6 py-4">
                        <Button variant="secondary" size="sm" onClick={() => handleAutoCollectSendInvite(item.id)}>
                          Send invite
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contracts table */}
        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden mb-6">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-h3 text-tx-heading">Engagement Letters</h2>
            <span className="text-body-sm text-tx-muted">{contracts.length} total</span>
          </div>
          {contracts.length === 0 ? (
            <div className="px-8 py-10 text-center text-body text-tx-muted">No contracts yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Client', 'Title', 'Status', 'Signer', 'Signed', 'Sent', 'View'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract, index) => {
                    const project = projects.find((p) => p.id === contract.project_id);
                    const isSigned = contract.status === 'signed';
                    return (
                      <tr key={contract.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${index % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-tx-heading">{project?.name || project?.email || contract.signer_email || '-'}</p>
                          {project?.name && <p className="text-tx-muted text-[11px] mt-0.5">{project.email}</p>}
                        </td>
                        <td className="px-6 py-4 text-tx-body">{contract.title ?? 'Engagement Letter'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${
                            isSigned ? 'bg-teal-100 text-teal-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {isSigned ? 'signed' : 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-tx-body">{contract.signer_name ?? '-'}</td>
                        <td className="px-6 py-4 text-tx-muted">{formatDate(contract.signed_at)}</td>
                        <td className="px-6 py-4 text-tx-muted">{formatDate(contract.sent_at ?? contract.created_at)}</td>
                        <td className="px-6 py-4">
                          {project && (
                            <a
                              href={`/dashboard/contract?id=${project.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-brand-teal hover:underline"
                            >
                              View
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leads / Deals Pipeline */}
        <div className="mt-8 bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-h3 text-tx-heading">Leads</h2>
              <p className="text-body-sm text-tx-muted mt-0.5">Pre-intake prospects from the contact form.</p>
            </div>
            <span className="text-body-sm text-tx-muted">{leads.length} total</span>
          </div>
          {leadsLoading ? (
            <div className="px-8 py-10 text-center text-body text-tx-muted animate-pulse">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="px-8 py-10 text-center text-body text-tx-muted">No leads yet. They will appear here when someone submits the contact form.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Name', 'Email', 'Company', 'Message', 'Status', 'Received'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, idx) => (
                    <tr key={lead.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${idx % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                      <td className="px-6 py-4 font-medium text-tx-heading whitespace-nowrap">{lead.name}</td>
                      <td className="px-6 py-4 text-tx-secondary"><a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a></td>
                      <td className="px-6 py-4 text-tx-muted">{lead.company ?? '—'}</td>
                      <td className="px-6 py-4 text-tx-secondary max-w-xs truncate" title={lead.message ?? ''}>{lead.message ?? '—'}</td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => void handleUpdateLeadStatus(lead.id, e.target.value)}
                          className="text-body-sm border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-border-focus"
                        >
                          {['new', 'contacted', 'qualified', 'converted', 'lost'].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-tx-muted whitespace-nowrap">{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-border">
            <h2 className="text-h3 text-tx-heading">Branding Editor</h2>
            <p className="text-body-sm text-tx-muted mt-0.5">Customize emails and proposals per project for white-label use.</p>
          </div>
          <div className="px-8 py-6 space-y-5">
            <div>
              <label className="block text-body-sm font-semibold text-tx-heading mb-1">Project</label>
              <select
                value={brandingProjectId}
                onChange={(e) => {
                  setBrandingProjectId(e.target.value);
                  void handleLoadBranding(e.target.value);
                }}
                className="w-full max-w-sm text-body-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-border-focus"
              >
                <option value="">— Select a project —</option>
                {state.phase === 'ready' && state.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.email || p.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>
            {brandingProjectId && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-1">Company Name</label>
                  <input type="text" value={brandingForm.companyName} onChange={(e) => setBrandingForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="e.g. Acme Agency" className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" />
                </div>
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={brandingForm.primaryColor} onChange={(e) => setBrandingForm((f) => ({ ...f, primaryColor: e.target.value }))} className="w-10 h-10 rounded border border-border cursor-pointer p-0.5" />
                    <input type="text" value={brandingForm.primaryColor} onChange={(e) => setBrandingForm((f) => ({ ...f, primaryColor: e.target.value }))} className="flex-1 text-body-sm border border-border rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-border-focus" />
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-1">Logo URL <span className="text-tx-muted font-normal">(https)</span></label>
                  <input type="url" value={brandingForm.logoUrl} onChange={(e) => setBrandingForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://yourco.com/logo.png" className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" />
                </div>
                <div>
                  <label className="block text-body-sm font-semibold text-tx-heading mb-1">Tagline <span className="text-tx-muted font-normal">(shown in email header)</span></label>
                  <input type="text" value={brandingForm.tagline} onChange={(e) => setBrandingForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="e.g. Powered by Acme" className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-body-sm font-semibold text-tx-heading mb-1">Reply Email</label>
                  <input type="email" value={brandingForm.replyEmail} onChange={(e) => setBrandingForm((f) => ({ ...f, replyEmail: e.target.value }))} placeholder="hello@yourclient.com" className="w-full max-w-sm text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" />
                </div>
              </div>
            )}
            {brandingProjectId && (
              <div className="flex items-center gap-4 pt-2">
                <Button variant="primary" size="sm" onClick={() => void handleSaveBranding()} disabled={brandingSaving}>
                  {brandingSaving ? 'Saving…' : 'Save branding'}
                </Button>
                {brandingSaveMsg && <span className="text-body-sm text-tx-secondary">{brandingSaveMsg}</span>}
              </div>
            )}
            {!brandingProjectId && (
              <p className="text-body-sm text-tx-muted">Select a project above to set its branding.</p>
            )}
          </div>
        </div>

        {/* Phase 15: Webhooks */}
        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-border">
            <h2 className="text-h3 text-tx-heading">Outbound Webhooks</h2>
            <p className="text-body-sm text-tx-muted mt-0.5">Send real-time events to Zapier, Slack, Xero, or any HTTPS endpoint.</p>
          </div>
          <div className="px-8 py-6 space-y-6">
            <div>
              <label className="block text-body-sm font-semibold text-tx-heading mb-1">Project</label>
              <select
                value={webhookProjectId}
                onChange={(e) => {
                  setWebhookProjectId(e.target.value);
                  void handleLoadWebhooks(e.target.value);
                  setNewWebhookSecret(null);
                  setWebhookMsg(null);
                }}
                className="w-full max-w-sm text-body-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-border-focus"
              >
                <option value="">— Select a project —</option>
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.email || p.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>

            {webhookProjectId && (
              <>
                {webhooks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-body-sm font-semibold text-tx-heading">Registered endpoints</p>
                    {webhooks.map((ep) => (
                      <div key={ep.id} className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-body-sm font-mono text-tx-heading truncate">{ep.url}</p>
                          <p className="text-[11px] text-tx-muted mt-0.5">{ep.events.length > 0 ? ep.events.join(', ') : 'All events'}</p>
                        </div>
                        <button
                          onClick={() => void handleDeleteWebhook(ep.id)}
                          className="shrink-0 text-[11px] text-red-500 hover:text-red-700 font-semibold mt-0.5"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newWebhookSecret && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-body-sm font-semibold text-green-800 mb-1">Signing secret — copy now, shown once</p>
                    <code className="text-[12px] font-mono text-green-900 break-all">{newWebhookSecret}</code>
                    <p className="text-[11px] text-green-700 mt-1">Use this in your endpoint to verify <code>X-Una-Signature</code> (HMAC-SHA256).</p>
                  </div>
                )}

                <div className="space-y-4 pt-2 border-t border-border">
                  <p className="text-body-sm font-semibold text-tx-heading pt-2">Register new endpoint</p>
                  <div>
                    <label className="block text-body-sm font-semibold text-tx-heading mb-1">URL <span className="text-tx-muted font-normal">(https)</span></label>
                    <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.zapier.com/..." className="w-full text-body-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-border-focus" />
                  </div>
                  <div>
                    <label className="block text-body-sm font-semibold text-tx-heading mb-1">Events <span className="text-tx-muted font-normal">(leave empty = all)</span></label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {WEBHOOK_EVENT_OPTIONS.map((evt) => (
                        <label key={evt} className="flex items-center gap-1.5 text-body-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhookEvents.includes(evt)}
                            onChange={(e) => setWebhookEvents((prev) => e.target.checked ? [...prev, evt] : prev.filter((v) => v !== evt))}
                          />
                          {evt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button variant="primary" size="sm" onClick={() => void handleAddWebhook()} disabled={webhookAdding || !webhookUrl}>
                      {webhookAdding ? 'Registering…' : 'Register endpoint'}
                    </Button>
                    {webhookMsg && <span className="text-body-sm text-tx-secondary">{webhookMsg}</span>}
                  </div>
                </div>
              </>
            )}
            {!webhookProjectId && (
              <p className="text-body-sm text-tx-muted">Select a project above to manage its webhooks.</p>
            )}
          </div>
        </div>

        {/* Phase 14: Connect onboarding */}
        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-border">
            <h2 className="text-h3 text-tx-heading">Stripe Connect</h2>
            <p className="text-body-sm text-tx-muted mt-0.5">Onboard each agency/project owner to receive payouts through Connect.</p>
          </div>
          <div className="px-8 py-6 space-y-5">
            <div>
              <label className="block text-body-sm font-semibold text-tx-heading mb-1">Project</label>
              <select
                value={connectProjectId}
                onChange={(e) => {
                  setConnectProjectId(e.target.value);
                  void handleLoadConnectStatus(e.target.value);
                }}
                className="w-full max-w-sm text-body-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-border-focus"
              >
                <option value="">— Select a project —</option>
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.email || p.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>

            {connectProjectId && (
              <div className="rounded-xl border border-border px-4 py-4 bg-bg-offwhite/30">
                {connectLoading ? (
                  <p className="text-body-sm text-tx-muted">Loading Connect status...</p>
                ) : connectStatus ? (
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3 text-body-sm">
                      <p><span className="text-tx-muted">Account:</span> <span className="font-mono text-tx-heading">{connectStatus.project.connect_account_id || 'Not linked yet'}</span></p>
                      <p><span className="text-tx-muted">Onboarding:</span> <span className="text-tx-heading">{connectStatus.project.connect_onboarding_complete ? 'Complete' : 'Pending'}</span></p>
                      <p><span className="text-tx-muted">Charges:</span> <span className="text-tx-heading">{connectStatus.project.connect_charges_enabled ? 'Enabled' : 'Disabled'}</span></p>
                      <p><span className="text-tx-muted">Payouts:</span> <span className="text-tx-heading">{connectStatus.project.connect_payouts_enabled ? 'Enabled' : 'Disabled'}</span></p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button variant="primary" size="sm" onClick={() => void handleStartConnectOnboarding()} disabled={connectLoading}>
                        {connectStatus.project.connect_account_id ? 'Resume onboarding' : 'Start onboarding'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleOpenConnectDashboard()}
                        disabled={!connectStatus.project.connect_account_id || connectLoading}
                      >
                        Open Stripe dashboard
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void handleLoadConnectStatus(connectProjectId)} disabled={connectLoading}>
                        Refresh status
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-body-sm text-tx-muted">No Connect status loaded yet.</p>
                )}
                {connectMsg && <p className="text-body-sm text-tx-secondary mt-3">{connectMsg}</p>}
              </div>
            )}

            {!connectProjectId && (
              <p className="text-body-sm text-tx-muted">Select a project above to manage its Connect onboarding.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-h3 text-tx-heading">Newsletter Subscribers</h2>
            <span className="text-body-sm text-tx-muted">{subscribers.length} total</span>
          </div>
          {subscribers.length === 0 ? (
            <div className="px-8 py-10 text-center text-body text-tx-muted">No subscribers yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Email', 'Subscribed'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber, index) => (
                    <tr key={subscriber.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${index % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                      <td className="px-6 py-4 font-medium text-tx-heading">{subscriber.email}</td>
                      <td className="px-6 py-4 text-tx-muted">{formatDate(subscriber.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
