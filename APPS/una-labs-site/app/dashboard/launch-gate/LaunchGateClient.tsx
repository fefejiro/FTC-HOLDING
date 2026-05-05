'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { isProjectAdminEmail, normalizeProjectStatus } from '@/lib/projects';

type ProjectRecord = {
  id: string;
  client_name?: string;
  client_email?: string;
  email?: string;
  domain?: string;
  status?: string;
  live_url?: string | null;
  handover_doc?: string | null;
};

type MilestoneRecord = {
  id: string;
  project_id: string;
  status?: string;
  proof_url?: string | null;
  proof_note?: string | null;
};

type InvoiceRecord = {
  id: string;
  project_id?: string | null;
  status?: string | null;
  amount_due?: number | null;
  amount_remaining?: number | null;
};

type ContractRecord = {
  id: string;
  project_id?: string | null;
  status?: string | null;
};

type GateCard = {
  project: ProjectRecord;
  ready: boolean;
  blockers: string[];
  checks: {
    milestonesDone: boolean;
    noBlockedMilestones: boolean;
    proofComplete: boolean;
    contractSigned: boolean;
    noOutstandingBalance: boolean;
    liveUrlSet: boolean;
    handoverDocSet: boolean;
  };
};

type LaunchGateState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'forbidden'; email: string }
  | {
      phase: 'ready';
      email: string;
      projects: ProjectRecord[];
      milestones: MilestoneRecord[];
      invoices: InvoiceRecord[];
      contracts: ContractRecord[];
      warnings: string[];
    }
  | { phase: 'error'; message: string };

function hasOutstandingInvoice(invoice: InvoiceRecord): boolean {
  const status = (invoice.status ?? '').toLowerCase();
  if (['paid', 'void', 'canceled', 'cancelled'].includes(status)) return false;
  const amountRemaining = Number(invoice.amount_remaining ?? 0);
  const amountDue = Number(invoice.amount_due ?? 0);
  return amountRemaining > 0 || amountDue > 0;
}

export function LaunchGateClient() {
  const [state, setState] = useState<LaunchGateState>({ phase: 'loading' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'ready' | 'blocked' | 'review'>('all');

  useEffect(() => {
    async function load() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);

        const session = await getSession();
        if (!session?.user) {
          setState({
            phase: 'unauthenticated',
            redirectUrl: '/login?redirect=/dashboard/launch-gate',
          });
          return;
        }

        const email = session.user.email ?? '';
        if (!isProjectAdminEmail(email)) {
          setState({ phase: 'forbidden', email });
          return;
        }

        const client = createBrowserClient();
        const warnings: string[] = [];

        const [projectsResult, milestonesResult, invoicesResult, contractsResult] = await Promise.all([
          client.from('projects').select('*').order('created_at', { ascending: false }),
          client.from('milestones').select('*'),
          client.from('invoices').select('*'),
          client.from('contracts').select('*'),
        ]);

        if (projectsResult.error || milestonesResult.error) {
          throw projectsResult.error || milestonesResult.error || new Error('Unable to load launch gate.');
        }

        if (invoicesResult.error) {
          warnings.push('Invoices table unavailable. Billing checks are partial.');
        }
        if (contractsResult.error) {
          warnings.push('Contracts table unavailable. Contract checks are partial.');
        }

        setState({
          phase: 'ready',
          email,
          projects: (projectsResult.data as ProjectRecord[] | null) ?? [],
          milestones: (milestonesResult.data as MilestoneRecord[] | null) ?? [],
          invoices: (invoicesResult.data as InvoiceRecord[] | null) ?? [],
          contracts: (contractsResult.data as ContractRecord[] | null) ?? [],
          warnings,
        });
      } catch (error) {
        setState({
          phase: 'error',
          message: error instanceof Error ? error.message : 'Unable to load launch gate.',
        });
      }
    }

    void load();
  }, []);

  const gateCards = useMemo<GateCard[]>(() => {
    if (state.phase !== 'ready') return [];

    const milestonesByProject = new Map<string, MilestoneRecord[]>();
    for (const milestone of state.milestones) {
      const arr = milestonesByProject.get(milestone.project_id) ?? [];
      arr.push(milestone);
      milestonesByProject.set(milestone.project_id, arr);
    }

    const invoicesByProject = new Map<string, InvoiceRecord[]>();
    for (const invoice of state.invoices) {
      if (!invoice.project_id) continue;
      const arr = invoicesByProject.get(invoice.project_id) ?? [];
      arr.push(invoice);
      invoicesByProject.set(invoice.project_id, arr);
    }

    const contractsByProject = new Map<string, ContractRecord[]>();
    for (const contract of state.contracts) {
      if (!contract.project_id) continue;
      const arr = contractsByProject.get(contract.project_id) ?? [];
      arr.push(contract);
      contractsByProject.set(contract.project_id, arr);
    }

    return state.projects.map((project) => {
      const milestones = milestonesByProject.get(project.id) ?? [];
      const invoices = invoicesByProject.get(project.id) ?? [];
      const contracts = contractsByProject.get(project.id) ?? [];

      const completeStates = ['complete', 'completed', 'approved', 'done'];
      const blockedStates = ['blocked'];
      const doneMilestones = milestones.filter((m) => completeStates.includes((m.status ?? '').toLowerCase()));
      const blockedMilestones = milestones.filter((m) => blockedStates.includes((m.status ?? '').toLowerCase()));
      const proofMissingCount = doneMilestones.filter((m) => !(m.proof_url || m.proof_note)).length;

      const contractSigned = contracts.some((contract) => ['signed', 'accepted', 'active'].includes((contract.status ?? '').toLowerCase()));
      const noOutstandingBalance = invoices.length === 0 || invoices.every((invoice) => !hasOutstandingInvoice(invoice));
      const milestonesDone = milestones.length > 0 && doneMilestones.length === milestones.length;
      const noBlockedMilestones = blockedMilestones.length === 0;
      const proofComplete = proofMissingCount === 0;
      const liveUrlSet = Boolean(project.live_url);
      const handoverDocSet = Boolean(project.handover_doc);

      const checks = {
        milestonesDone,
        noBlockedMilestones,
        proofComplete,
        contractSigned,
        noOutstandingBalance,
        liveUrlSet,
        handoverDocSet,
      };

      const blockers: string[] = [];
      if (!milestonesDone) blockers.push('Milestones are not fully complete/approved.');
      if (!noBlockedMilestones) blockers.push('One or more milestones are blocked.');
      if (!proofComplete) blockers.push('Completed milestones are missing proof links or notes.');
      if (!contractSigned) blockers.push('Contract is not signed/accepted.');
      if (!noOutstandingBalance) blockers.push('Outstanding invoice balance exists.');
      if (!liveUrlSet) blockers.push('Live URL is not set.');
      if (!handoverDocSet) blockers.push('Handover notes/document are not recorded.');

      return {
        project,
        ready: blockers.length === 0,
        checks,
        blockers,
      };
    });
  }, [state]);

  const filteredCards = useMemo(() => {
    let list = gateCards;
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(({ project }) =>
        (project.client_name ?? '').toLowerCase().includes(query)
        || (project.client_email ?? '').toLowerCase().includes(query)
        || (project.email ?? '').toLowerCase().includes(query)
        || (project.domain ?? '').toLowerCase().includes(query),
      );
    }

    if (filter === 'ready') list = list.filter((card) => card.ready);
    if (filter === 'blocked') list = list.filter((card) => !card.ready);
    if (filter === 'review') {
      list = list.filter((card) => {
        const rawStatus = (card.project.status ?? '').toLowerCase();
        return rawStatus === 'review' || rawStatus === 'awaiting_approval';
      });
    }

    return list;
  }, [filter, gateCards, search]);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading launch gate...</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Authentication required</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Sign in to access Launch Gate</h1>
          <div className="mt-6">
            <a
              href={state.redirectUrl}
              className="inline-block bg-brand-teal text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'forbidden') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Restricted</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Launch Gate is operator-only</h1>
          <p className="mt-2 text-body text-tx-secondary">Signed in as {state.email}</p>
          <div className="mt-6">
            <Button href="/dashboard" variant="secondary" size="md">Back to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Error</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Unable to load Launch Gate</h1>
          <p className="mt-3 text-body text-tx-secondary">{state.message}</p>
        </div>
      </div>
    );
  }

  const readyCount = gateCards.filter((card) => card.ready).length;
  const blockedCount = gateCards.length - readyCount;

  return (
    <div className="min-h-screen bg-offwhite">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="teal">Release Readiness</Badge>
            <h1 className="mt-4 text-display text-tx-heading">Launch Gate</h1>
            <p className="mt-2 text-body text-tx-secondary">
              One board to decide if projects are ready for live handover.
            </p>
          </div>
          <div className="flex gap-2">
            <Button href="/dashboard/actions" variant="secondary" size="sm">Action Center</Button>
            <Button href="/dashboard" variant="secondary" size="sm">Back to dashboard</Button>
          </div>
        </div>

        {state.warnings.length > 0 && (
          <div className="mt-6 rounded-xl border border-brand-orange/30 bg-orange-50 px-4 py-3 text-body-sm text-brand-orange">
            {state.warnings.join(' ')}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-tx-muted">Projects</p>
            <p className="mt-1 text-h3 text-tx-heading">{gateCards.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-tx-muted">Ready</p>
            <p className="mt-1 text-h3 text-brand-teal">{readyCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-tx-muted">Blocked</p>
            <p className="mt-1 text-h3 text-brand-orange">{blockedCount}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-white px-6 py-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by client, email, or domain..."
              className="flex-1 rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-body-sm text-tx-heading placeholder:text-tx-muted focus:outline-none focus:border-brand-teal"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'ready', label: 'Ready' },
                { key: 'blocked', label: 'Blocked' },
                { key: 'review', label: 'In review' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key as 'all' | 'ready' | 'blocked' | 'review')}
                  className={`rounded-full px-3 py-1.5 text-body-sm font-semibold transition-colors ${
                    filter === option.key
                      ? 'bg-brand-teal text-white'
                      : 'border border-border bg-white text-tx-secondary hover:bg-bg-subtle'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-white px-6 py-10 text-center">
            <p className="text-body text-tx-secondary">No projects match your current filters.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {filteredCards.map((card) => (
              <div key={card.project.id} className="rounded-2xl border border-border bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-body font-semibold text-tx-heading">
                      {card.project.client_name || card.project.email || 'Untitled project'}
                    </p>
                    <p className="mt-1 text-body-sm text-tx-secondary">
                      {card.project.client_email || card.project.email || '-'} | {card.project.domain || 'No domain'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={card.ready ? 'teal' : 'orange'}>{card.ready ? 'Ready' : 'Blocked'}</Badge>
                      <Badge variant="muted">{normalizeProjectStatus(card.project.status)}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-body-sm">
                    <a href={`/dashboard/report?id=${card.project.id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-teal hover:underline underline-offset-2">Report</a>
                    <a href={`/dashboard/contract?id=${card.project.id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-teal hover:underline underline-offset-2">Contract</a>
                    <a href={`/dashboard/handover?id=${card.project.id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-teal hover:underline underline-offset-2">Handover</a>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <CheckRow label="Milestones complete" passed={card.checks.milestonesDone} />
                  <CheckRow label="No blocked milestones" passed={card.checks.noBlockedMilestones} />
                  <CheckRow label="Proof captured" passed={card.checks.proofComplete} />
                  <CheckRow label="Contract signed" passed={card.checks.contractSigned} />
                  <CheckRow label="No outstanding invoices" passed={card.checks.noOutstandingBalance} />
                  <CheckRow label="Live URL + handover note" passed={card.checks.liveUrlSet && card.checks.handoverDocSet} />
                </div>

                {!card.ready && (
                  <div className="mt-4 rounded-xl border border-brand-orange/30 bg-orange-50 px-4 py-3">
                    <p className="text-body-sm font-semibold text-brand-orange">Blockers</p>
                    <ul className="mt-2 text-body-sm text-tx-secondary space-y-1">
                      {card.blockers.map((blocker) => (
                        <li key={blocker}>• {blocker}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle px-3 py-2 flex items-center justify-between gap-3">
      <span className="text-body-sm text-tx-secondary">{label}</span>
      <span className={`text-body-sm font-semibold ${passed ? 'text-brand-teal' : 'text-brand-orange'}`}>
        {passed ? 'Pass' : 'Fail'}
      </span>
    </div>
  );
}
