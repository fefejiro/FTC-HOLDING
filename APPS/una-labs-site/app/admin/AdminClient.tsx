'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { STRIPE_API_URL } from '@/lib/stripe-config';

type Project = {
  id: string;
  email?: string;
  name?: string;
  tier?: string;
  billing?: string;
  status?: string;
  intake_id?: string;
  stripe_session_id?: string;
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
  | { phase: 'denied' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; projects: Project[]; milestones: Milestone[]; subscribers: Subscriber[]; contracts: Contract[]; invoices: Invoice[]; instantBills: InstantBill[] };

const ADMIN_EMAIL = 'mike.fejiro@gmail.com';

const TIER_PRICE: Record<string, number> = {
  starter: 67,
  professional: 135,
  agency: 339,
  enterprise: 679,
};

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-blue-100 text-blue-700',
  scoped: 'bg-purple-100 text-purple-700',
  active: 'bg-orange-100 text-orange-700',
  review: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-teal-100 text-teal-700',
  paused: 'bg-gray-100 text-gray-500',
};

const PIPELINE_STAGES = ['intake', 'scoped', 'active', 'review', 'complete', 'paused'] as const;

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

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-3xl font-bold text-tx-heading">{value}</p>
      {sub && <p className="text-body-sm text-tx-secondary mt-1">{sub}</p>}
    </div>
  );
}

export function AdminClient() {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [view, setView] = useState<'pipeline' | 'table'>('pipeline');
  const [billing, setBilling] = useState<Record<string, BillingInfo>>({});
  const [billingLoading, setBillingLoading] = useState(false);
  const [instantBillProjectId, setInstantBillProjectId] = useState('');
  const [instantBillAmount, setInstantBillAmount] = useState('');
  const [instantBillDescription, setInstantBillDescription] = useState('');
  const [instantBillCreating, setInstantBillCreating] = useState(false);
  const [instantBillLink, setInstantBillLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);
        const session = await getSession();
        if (!session?.user || session.user.email !== ADMIN_EMAIL) {
          if (!cancelled) setState({ phase: 'denied' });
          return;
        }

        const client = createBrowserClient();
        const [
          { data: projects, error: projectError },
          { data: milestones, error: milestoneError },
          { data: subscribers, error: subscriberError },
          { data: contracts, error: contractError },
          { data: invoices, error: invoiceError },
          { data: instantBills, error: instantBillsError },
        ] = await Promise.all([
          client.from('projects').select('*').order('created_at', { ascending: false }),
          client.from('milestones').select('*').order('due_date', { ascending: true }),
          client.from('subscribers').select('*').order('created_at', { ascending: false }),
          client.from('contracts').select('id,project_id,title,status,sent_at,signer_name,signer_email,signed_at,created_at').order('created_at', { ascending: false }),
          client.from('invoices').select('*').order('created_at', { ascending: false }),
          client.from('instant_bills').select('*').order('created_at', { ascending: false }),
        ]);

        if (projectError) throw projectError;
        if (milestoneError) throw milestoneError;
        if (subscriberError) throw subscriberError;
        if (contractError) throw contractError;
        if (invoiceError) throw invoiceError;
        if (instantBillsError) throw instantBillsError;

        if (!cancelled) {
          setState({
            phase: 'ready',
            projects: (projects as Project[] | null) ?? [],
            milestones: (milestones as Milestone[] | null) ?? [],
            subscribers: (subscribers as Subscriber[] | null) ?? [],
            contracts: (contracts as Contract[] | null) ?? [],
            invoices: (invoices as Invoice[] | null) ?? [],
            instantBills: (instantBills as InstantBill[] | null) ?? [],
          });

          // Fetch billing status for projects with Stripe sessions
          const projectList = (projects as Project[] | null) ?? [];
          const sessionIds = projectList
            .map((p) => p.stripe_session_id)
            .filter((id): id is string => Boolean(id));

          if (sessionIds.length > 0) {
            setBillingLoading(true);
            try {
              const token = session?.access_token;
              const res = await fetch(`${STRIPE_API_URL}/api/admin/billing`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ stripe_session_ids: sessionIds }),
              });
              if (res.ok) {
                const data = await res.json() as { billing: Record<string, BillingInfo> };
                if (!cancelled) setBilling(data.billing);
              }
            } catch { /* non-fatal */ }
            if (!cancelled) setBillingLoading(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setState({ phase: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStatusChange(projectId: string, newStatus: string) {
    const { createBrowserClient } = await import('@ftc/supabase');
    const client = createBrowserClient();
    const { error } = await client.from('projects').update({ status: newStatus }).eq('id', projectId);
    if (error) {
      alert(`Failed to update: ${error.message}`);
      return;
    }
    setState((prev) => {
      if (prev.phase !== 'ready') return prev;
      return {
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p)),
      };
    });
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

    if (!instantBillProjectId) {
      alert('Select a project first.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid amount.');
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

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  if (state.phase === 'denied') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <Badge variant="muted">Access denied</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Admin only</h1>
          <p className="mt-3 text-body text-tx-secondary">This page is restricted.</p>
          <div className="mt-6">
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
    .filter((project) => !['paused', 'complete'].includes(project.status ?? ''))
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

  return (
    <section className="bg-bg-offwhite min-h-screen">
      <div className="max-w-content mx-auto px-6 pt-14 pb-24">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <Badge variant="teal">Admin</Badge>
            <h1 className="mt-3 text-display-sm text-tx-heading">Una Labs - Reporting</h1>
            <p className="mt-1 text-body text-tx-muted">All projects, milestones, and subscribers.</p>
          </div>
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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <Stat label="Total projects" value={projects.length} />
          <Stat label="Est. MRR" value={`CA$${totalMRR.toLocaleString('en-CA')}`} sub="Active plans only" />
          <Stat label="Needs approval" value={needsApproval.length} sub="Milestones in review" />
          <Stat label="Subscribers" value={subscribers.length} sub="Newsletter list" />
          <Stat label="Contracts signed" value={contracts.filter((c) => c.status === 'signed').length} sub={`${contracts.length} total sent`} />
          <Stat label="Unpaid invoices" value={invoices.filter((invoice) => invoice.status === 'unpaid').length} sub={`${invoices.length} total`} />
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10">
          {(['intake', 'scoped', 'active', 'review', 'complete', 'paused'] as const).map((status) => (
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
                        return (
                          <div key={project.id} className="bg-bg-offwhite rounded-xl border border-border p-3">
                            <p className="text-body-sm font-semibold text-tx-heading truncate">{project.name || project.email}</p>
                            {project.name && <p className="text-[11px] text-tx-muted truncate">{project.email}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {project.tier && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-teal/10 text-brand-teal capitalize">{project.tier}</span>
                              )}
                              {pm.length > 0 && (
                                <span className="text-[10px] text-tx-muted">{done}/{pm.length}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-tx-muted mt-1">{formatDate(project.created_at)}</p>
                            <select
                              className="mt-2 w-full text-[11px] border border-border rounded-lg px-2 py-1.5 bg-white text-tx-body cursor-pointer"
                              value={project.status ?? 'intake'}
                              onChange={(e) => handleStatusChange(project.id, e.target.value)}
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
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
                    {['Client', 'Plan', 'Billing', 'Status', 'Subscription', 'Milestones', 'Started'].map((heading) => (
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
                        <td className="px-6 py-4 capitalize text-tx-body">{project.tier ?? '-'}</td>
                        <td className="px-6 py-4 capitalize text-tx-body">{project.billing ?? '-'}</td>
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
                            {hasReview && <span className="text-[10px] font-bold text-brand-orange">review</span>}
                          </div>
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
                min="1"
                step="0.01"
                value={instantBillAmount}
                onChange={(event) => setInstantBillAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-body-sm"
                placeholder="250"
              />
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
