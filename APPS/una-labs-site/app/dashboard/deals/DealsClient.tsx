'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { isProjectAdminEmail } from '@/lib/projects';
import { getStripeApiUrl } from '@/lib/stripe-config';

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

type DealsState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'forbidden'; email: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; leads: Lead[]; accessToken: string };

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'] as const;
type LeadStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
};

const PIPELINE_STAGES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'won'];

function badgeVariant(status: string): 'teal' | 'orange' | 'muted' {
  if (status === 'won') return 'teal';
  if (['new', 'contacted', 'qualified', 'proposal_sent'].includes(status)) return 'orange';
  return 'muted';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function daysSince(value?: string | null): number {
  if (!value) return 0;
  const diff = Date.now() - new Date(value).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function DealsClient() {
  const [state, setState] = useState<DealsState>({ phase: 'loading' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<LeadStatus>('new');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [{ getSession }] = await Promise.all([import('@ftc/auth')]);
        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: '/login?redirect=/dashboard/deals' });
          return;
        }

        const email = session.user.email ?? '';
        if (!isProjectAdminEmail(email)) {
          setState({ phase: 'forbidden', email });
          return;
        }

        const accessToken = session.access_token ?? '';
        const res = await fetch(getStripeApiUrl('/api/admin/leads'), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          throw new Error('Failed to load leads.');
        }

        const body = await res.json() as { ok: boolean; leads: Lead[] };
        setState({ phase: 'ready', email, leads: body.leads ?? [], accessToken });
      } catch (err) {
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Unable to load deals pipeline.',
        });
      }
    }

    void load();
  }, []);

  const filteredLeads = useMemo<Lead[]>(() => {
    if (state.phase !== 'ready') return [];
    let leads = state.leads;

    if (statusFilter !== 'all') {
      leads = leads.filter((l) => l.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.company ?? '').toLowerCase().includes(q) ||
          (l.message ?? '').toLowerCase().includes(q),
      );
    }

    return leads;
  }, [state, statusFilter, search]);

  const pipelineCounts = useMemo<Record<LeadStatus, number>>(() => {
    if (state.phase !== 'ready') {
      return { new: 0, contacted: 0, qualified: 0, proposal_sent: 0, won: 0, lost: 0 };
    }
    const counts: Record<string, number> = {};
    for (const lead of state.leads) {
      counts[lead.status] = (counts[lead.status] ?? 0) + 1;
    }
    return STATUS_OPTIONS.reduce(
      (acc, s) => { acc[s] = counts[s] ?? 0; return acc; },
      {} as Record<LeadStatus, number>,
    );
  }, [state]);

  async function handleSaveEdit() {
    if (state.phase !== 'ready' || !editingId) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(getStripeApiUrl(`/api/admin/leads/${editingId}`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${state.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: editStatus, notes: editNotes }),
      });
      if (!res.ok) throw new Error('Failed to update lead.');
      const body = await res.json() as { ok: boolean; lead: Lead };
      setState((prev) => {
        if (prev.phase !== 'ready') return prev;
        return {
          ...prev,
          leads: prev.leads.map((l) => (l.id === editingId ? body.lead : l)),
        };
      });
      setEditingId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(lead: Lead) {
    setEditingId(lead.id);
    setEditStatus(lead.status as LeadStatus);
    setEditNotes(lead.notes ?? '');
    setSaveError('');
  }

  // --- Render states ---
  if (state.phase === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading deals pipeline…</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-body text-tx-secondary">You need to sign in to view the deals pipeline.</p>
        <Button href={state.redirectUrl} variant="primary" size="md">Sign in</Button>
      </div>
    );
  }

  if (state.phase === 'forbidden') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-body text-tx-secondary">The deals pipeline is only available to operators.</p>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-body text-tx-secondary">{state.message}</p>
      </div>
    );
  }

  const totalLeads = state.leads.length;
  const activeLeads = state.leads.filter((l) => !['won', 'lost'].includes(l.status)).length;
  const wonLeads = pipelineCounts.won;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg-offwhite">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Badge variant="teal">Deals Pipeline</Badge>
              <h1 className="mt-2 text-display-sm text-tx-heading">Leads &amp; Prospects</h1>
              <p className="mt-1 text-body text-tx-secondary">
                Contact form submissions and inbound prospects tracked through to close.
              </p>
            </div>
            <Button href="/dashboard" variant="secondary" size="sm">
              ← Back to dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total leads', value: totalLeads },
            { label: 'Active in pipeline', value: activeLeads },
            { label: 'Won', value: wonLeads },
            { label: 'Conversion rate', value: `${conversionRate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-border p-5">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">{label}</p>
              <p className="mt-2 text-display-sm text-tx-heading font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Pipeline funnel */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-h3 text-tx-heading font-semibold mb-5">Pipeline stages</h2>
          <div className="flex flex-wrap gap-3">
            {PIPELINE_STAGES.map((stage, i) => {
              const count = pipelineCounts[stage];
              const maxCount = Math.max(...PIPELINE_STAGES.map((s) => pipelineCounts[s]), 1);
              const widthPct = Math.max(Math.round((count / maxCount) * 100), 8);
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === stage ? 'all' : stage)}
                  className={`flex-1 min-w-[120px] rounded-xl border p-4 text-left transition-all cursor-pointer
                    ${statusFilter === stage
                      ? 'border-brand-teal bg-teal-50'
                      : 'border-border bg-bg-subtle hover:border-brand-teal/50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body-sm font-semibold text-tx-heading">{STATUS_LABELS[stage]}</span>
                    <span className="text-body font-bold text-tx-heading">{count}</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${i === 4 ? 'bg-brand-teal' : 'bg-brand-orange'}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-[10px] text-tx-muted uppercase tracking-wider">
                    {i < PIPELINE_STAGES.length - 1 ? `→ ${STATUS_LABELS[PIPELINE_STAGES[i + 1]]}` : 'Closed won'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-body focus:outline-none focus:border-border-focus"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
            className="px-4 py-2.5 rounded-lg border border-border text-body focus:outline-none focus:border-border-focus bg-white"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Lead cards */}
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <p className="text-body text-tx-muted">
              {state.leads.length === 0
                ? 'No leads yet. Contact form submissions will appear here automatically.'
                : 'No leads match your current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => {
              const age = daysSince(lead.created_at);
              const isEditing = editingId === lead.id;
              return (
                <div key={lead.id} className="bg-white rounded-2xl border border-border p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-body font-semibold text-tx-heading">{lead.name}</p>
                        <Badge variant={badgeVariant(lead.status)}>
                          {STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                        </Badge>
                        {lead.converted_project_id && (
                          <Badge variant="teal">Converted</Badge>
                        )}
                      </div>
                      <p className="text-body-sm text-tx-secondary">{lead.email}</p>
                      {lead.company && (
                        <p className="text-body-sm text-tx-muted">{lead.company}</p>
                      )}
                      {lead.message && (
                        <p className="mt-2 text-body-sm text-tx-body line-clamp-2">{lead.message}</p>
                      )}
                      {lead.notes && !isEditing && (
                        <p className="mt-2 text-body-sm text-tx-muted italic">Note: {lead.notes}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right text-body-sm text-tx-muted space-y-1">
                      <p>{formatDate(lead.created_at)}</p>
                      <p>{age === 0 ? 'Today' : `${age}d ago`}</p>
                      <p className="text-[10px] uppercase tracking-wider">{lead.source}</p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-5 space-y-4 border-t border-border pt-5">
                      <div>
                        <label className="block text-body-sm font-semibold text-tx-muted uppercase tracking-wider mb-1">
                          Status
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                          className="w-full px-4 py-2.5 rounded-lg border border-border text-body focus:outline-none focus:border-border-focus bg-white"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-body-sm font-semibold text-tx-muted uppercase tracking-wider mb-1">
                          Notes
                        </label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={3}
                          placeholder="Add internal notes about this lead…"
                          className="w-full px-4 py-3 rounded-lg border border-border text-body resize-none focus:outline-none focus:border-border-focus"
                        />
                      </div>
                      {saveError && (
                        <p className="text-body-sm text-red-500">{saveError}</p>
                      )}
                      <div className="flex gap-3">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => void handleSaveEdit()}
                          disabled={saving}
                        >
                          {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        {lead.converted_project_id && (
                          <Button
                            href={`/dashboard?project=${lead.converted_project_id}`}
                            variant="secondary"
                            size="sm"
                          >
                            Open project →
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-border flex gap-3">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(lead)}>
                        Update status
                      </Button>
                      {lead.converted_project_id && (
                        <Button
                          href={`/dashboard?project=${lead.converted_project_id}`}
                          variant="secondary"
                          size="sm"
                        >
                          Open project →
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
