'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionCard, normalizeStageId, STAGE_RAIL } from '@/components/portal/StageRail';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { getCommercialLabel } from '@/lib/service-engagement';

// ----- types -----

type MilestoneRecord = {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  due_date?: string;
  status?: string;
  completed_at?: string | null;
  proof_url?: string;
};

type ArtifactRecord = {
  id: string;
  project_id: string;
  title?: string;
  type?: string;
  url?: string;
  note?: string;
  created_at?: string;
};

type PortalPayload = {
  project: {
    id: string;
    email?: string;
    name?: string;
    tier?: string;
    status?: string;
    created_at?: string;
    handover_doc?: string | null;
  };
  milestones: MilestoneRecord[];
  artifacts: Array<{ title: string; type: string; url?: string; note?: string; created_at?: string }>;
  payments: {
    invoices_sent?: number;
    invoices_paid?: number;
    outstanding_balance_cad?: number;
  };
  approvals: Array<{ title: string; status: string; action_url?: string }>;
};

type HandoverState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; payload: PortalPayload; artifacts: ArtifactRecord[] };

// ----- helpers -----

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function statusBadge(status?: string) {
  if (!status) return <Badge variant="muted">Unknown</Badge>;
  if (['complete', 'approved', 'signed', 'paid'].includes(status))
    return <Badge variant="teal">{status}</Badge>;
  if (['in_progress', 'sent', 'active'].includes(status))
    return <Badge variant="orange">{status}</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

// ----- component -----

export function HandoverClient() {
  const [state, setState] = useState<HandoverState>({ phase: 'loading' });
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    if (!id) {
      setState({ phase: 'error', message: 'No project ID provided.' });
      return;
    }

    async function load() {
      try {
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();
        if (!session?.user) {
          setState({
            phase: 'unauthenticated',
            redirectUrl: `/login?redirect=/dashboard/handover?id=${id}`,
          });
          return;
        }

        const [portalRes, artifactsRes] = await Promise.all([
          fetch(getStripeApiUrl('/api/project-home'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ project_id: id }),
          }),
          (async () => {
            const { createBrowserClient } = await import('@ftc/supabase');
            return createBrowserClient()
              .from('project_artifacts')
              .select('*')
              .eq('project_id', id)
              .order('created_at', { ascending: true });
          })(),
        ]);

        const portalPayload = (await portalRes.json()) as PortalPayload & { error?: string };
        if (!portalRes.ok) {
          setState({ phase: 'error', message: portalPayload.error ?? 'Unable to load project.' });
          return;
        }

        setState({
          phase: 'ready',
          email: session.user.email ?? '',
          payload: portalPayload,
          artifacts: (artifactsRes.data as ArtifactRecord[] | null) ?? [],
        });
      } catch (err) {
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Unable to load handover.',
        });
      }
    }

    void load();
  }, [id]);

  // ---- loading ----
  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading handover summary...</p>
      </div>
    );
  }

  // ---- unauthenticated ----
  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Authentication required</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Sign in to view the project handover</h1>
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

  // ---- error ----
  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Error</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Unable to load handover</h1>
          <p className="mt-4 text-body text-tx-secondary">{state.message}</p>
        </div>
      </div>
    );
  }

  // ---- ready ----
  const { payload, artifacts } = state;
  const { project, milestones, payments } = payload;

  const planLabel = getCommercialLabel(project.tier);
  const completedMilestones = milestones.filter((m) => ['complete', 'approved'].includes(m.status ?? ''));
  const pendingMilestones = milestones.filter((m) => !['complete', 'approved'].includes(m.status ?? ''));
  const stageId = normalizeStageId(project.status);
  const stage = STAGE_RAIL.find((s) => s.id === stageId);
  const allComplete = pendingMilestones.length === 0 && milestones.length > 0;
  const hasHandoverDoc = Boolean(project.handover_doc);
  const hasOpenBalance = (payments.outstanding_balance_cad ?? 0) > 0;
  const deliverableArtifacts = artifacts.filter((a) => ['deliverable', 'report', 'proof', 'document'].includes(a.type ?? ''));

  return (
    <div className="min-h-screen bg-offwhite">
      <div className="max-w-5xl mx-auto px-6 py-16 print:py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-10 print:mb-6">
          <div>
            <Badge variant={allComplete ? 'teal' : 'orange'}>
              {allComplete ? 'Project complete' : 'Completion pending'}
            </Badge>
            <h1 className="mt-4 text-display text-tx-heading">
              {project.name || `Project ${project.id.slice(0, 8)}`}
            </h1>
            <p className="mt-2 text-body text-tx-secondary">
              {planLabel} · Handover Summary · Generated {formatDate(new Date().toISOString())}
            </p>
          </div>
          <div className="flex gap-3 print:hidden">
            <Button variant="secondary" size="sm" href={`/dashboard/briefing?id=${project.id}`}>
              Client Briefing
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Readiness checklist */}
        <div className="mb-8">
        <SectionCard title="Handover readiness">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadinessRow
              label="All milestones complete"
              passed={allComplete}
              detail={
                allComplete
                  ? `${completedMilestones.length} of ${milestones.length} complete`
                  : `${completedMilestones.length} of ${milestones.length} complete — ${pendingMilestones.length} remaining`
              }
            />
            <ReadinessRow
              label="Handover doc generated"
              passed={hasHandoverDoc}
              detail={hasHandoverDoc ? 'Available below' : 'Generate from the operator dashboard'}
            />
            <ReadinessRow
              label="No outstanding balance"
              passed={!hasOpenBalance}
              detail={
                hasOpenBalance
                  ? `CA$${(payments.outstanding_balance_cad ?? 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })} outstanding`
                  : 'All invoices settled'
              }
            />
            <ReadinessRow
              label="Deliverables archived"
              passed={deliverableArtifacts.length > 0}
              detail={
                deliverableArtifacts.length > 0
                  ? `${deliverableArtifacts.length} deliverable${deliverableArtifacts.length > 1 ? 's' : ''} on record`
                  : 'No deliverables attached yet'
              }
            />
          </div>
        </SectionCard>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-8">

            {/* Milestone summary */}
            <SectionCard title="Milestones">
              {milestones.length === 0 ? (
                <p className="text-body text-tx-muted">No milestones recorded for this project.</p>
              ) : (
                <div className="space-y-3">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-bg-offwhite px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-tx-heading truncate">{m.title || 'Milestone'}</p>
                        {m.completed_at && (
                          <p className="text-body-sm text-tx-muted mt-0.5">Completed {formatDate(m.completed_at)}</p>
                        )}
                        {!m.completed_at && m.due_date && (
                          <p className="text-body-sm text-tx-muted mt-0.5">Target {formatDate(m.due_date)}</p>
                        )}
                      </div>
                      <div className="shrink-0">{statusBadge(m.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Deliverables */}
            {deliverableArtifacts.length > 0 && (
              <SectionCard title="Deliverables">
                <div className="space-y-3">
                  {deliverableArtifacts.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-bg-offwhite px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-tx-heading truncate">{a.title || 'Deliverable'}</p>
                        {a.note && <p className="text-body-sm text-tx-secondary mt-0.5">{a.note}</p>}
                        <p className="text-body-sm text-tx-muted mt-0.5">{formatDate(a.created_at)}</p>
                      </div>
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-body-sm font-semibold text-brand-teal hover:underline"
                        >
                          Open ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Handover document */}
            {hasHandoverDoc && (
              <SectionCard title="Handover document">
                <div className="rounded-xl border border-border bg-bg-offwhite p-6 whitespace-pre-line text-body text-tx-body leading-8 print:border-0 print:p-0">
                  {project.handover_doc}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Project summary */}
            <SectionCard title="Project details">
              <dl className="space-y-3">
                <DetailRow label="Client" value={state.email} />
                <DetailRow label="Plan" value={planLabel} />
                <DetailRow label="Stage" value={stage?.label ?? project.status ?? '—'} />
                <DetailRow label="Started" value={formatDate(project.created_at)} />
              </dl>
            </SectionCard>

            {/* Payment summary */}
            <SectionCard title="Billing summary">
              <dl className="space-y-3">
                <DetailRow label="Invoices sent" value={String(payments.invoices_sent ?? 0)} />
                <DetailRow label="Invoices paid" value={String(payments.invoices_paid ?? 0)} />
                <DetailRow
                  label="Outstanding"
                  value={
                    hasOpenBalance
                      ? `CA$${(payments.outstanding_balance_cad ?? 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`
                      : 'Nil'
                  }
                />
              </dl>
            </SectionCard>

            {/* Navigation */}
            <div className="print:hidden">
            <SectionCard title="Related surfaces">
              <div className="flex flex-col gap-2">
                <a href={`/portal?id=${project.id}`} className="text-body text-brand-teal hover:underline">Client portal →</a>
                <a href={`/dashboard/briefing?id=${project.id}`} className="text-body text-brand-teal hover:underline">Client briefing →</a>
                <a href={`/dashboard/report?id=${project.id}`} className="text-body text-brand-teal hover:underline">Progress report →</a>
                <a href={`/dashboard/contract?id=${project.id}`} className="text-body text-brand-teal hover:underline">Engagement letter →</a>
              </div>
            </SectionCard>
            </div>

          </div>
        </div>

        {/* Print footer */}
        <div className="hidden print:block mt-16 border-t border-border pt-6">
          <p className="text-body-sm text-tx-muted">
            Generated {formatDate(new Date().toISOString())} · Una Labs · unalabs.cloud
          </p>
        </div>

      </div>
    </div>
  );
}

// ----- sub-components -----

function ReadinessRow({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-bg-offwhite px-4 py-3">
      <span className={`mt-0.5 text-body-sm font-bold ${passed ? 'text-brand-teal' : 'text-brand-orange'}`}>
        {passed ? '✓' : '○'}
      </span>
      <div>
        <p className="text-body font-semibold text-tx-heading">{label}</p>
        <p className="text-body-sm text-tx-secondary">{detail}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-body-sm text-tx-muted">{label}</dt>
      <dd className="text-body text-tx-heading font-medium text-right">{value}</dd>
    </div>
  );
}
