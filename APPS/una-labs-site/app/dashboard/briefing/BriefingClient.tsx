'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { StageRail, ProjectClarityCards, SectionCard, normalizeStageId, STAGE_RAIL } from '@/components/portal/StageRail';
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
  proof_note?: string;
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
    intake_id?: string;
    name?: string;
    description?: string;
    plan?: string;
    tier?: string;
    status?: string;
    created_at?: string;
    ai_price_min_cad?: number | null;
    ai_price_max_cad?: number | null;
  };
  client_status: { label: string; description: string };
  current_phase: { title: string; meaning: string; expected_outcome: string };
  decisions: Array<{ title: string; detail: string }>;
  awaiting_on_us: Array<{ title: string; detail: string }>;
  awaiting_on_client: Array<{ title: string; detail: string; action_url?: string }>;
  artifacts: Array<{ title: string; type: string; url?: string; note?: string; created_at?: string }>;
  payments: {
    activation_fee_status?: string;
    deposit_status?: string;
    invoices_sent?: number;
    invoices_paid?: number;
    outstanding_balance_cad?: number;
    next_payment_link?: string;
  };
  progress_notes: Array<{ title: string; body: string; created_at?: string }>;
  next_milestone?: MilestoneRecord | null;
  approvals: Array<{ title: string; status: string; action_url?: string }>;
  milestones: MilestoneRecord[];
};

type BriefingState =
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

function formatMoney(value?: number | null) {
  if (!Number.isFinite(value)) return 'CA$0';
  return `CA$${Number(value).toLocaleString('en-CA')}`;
}

function MilestoneRow({ milestone }: { milestone: MilestoneRecord }) {
  const status = (milestone.status ?? '').toLowerCase();
  const isDone = ['complete', 'completed', 'approved', 'done'].includes(status);
  const isReview = status === 'review';
  return (
    <div className="p-4 bg-bg-subtle rounded-xl border border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-body font-semibold text-tx-heading">{milestone.title || 'Milestone'}</p>
          {milestone.description && <p className="mt-1 text-body-sm text-tx-secondary">{milestone.description}</p>}
        </div>
        <Badge variant={isDone ? 'teal' : isReview ? 'orange' : 'muted'}>{milestone.status || 'pending'}</Badge>
      </div>
      <div className="mt-2 flex items-center gap-3 text-body-sm text-tx-muted flex-wrap">
        <span>Due {formatDate(milestone.due_date)}</span>
        {milestone.completed_at && isDone && <span>Completed {formatDate(milestone.completed_at)}</span>}
      </div>
      {(milestone.proof_url || milestone.proof_note) && (
        <div className="mt-3 rounded-lg border border-brand-teal/30 bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">Milestone proof</p>
          {milestone.proof_note && <p className="mt-1 text-body-sm text-tx-body">{milestone.proof_note}</p>}
          {milestone.proof_url && (
            <a href={milestone.proof_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-body-sm font-semibold text-brand-teal hover:underline">
              Open proof link →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ----- main component -----

export function BriefingClient() {
  const [state, setState] = useState<BriefingState>({ phase: 'loading' });
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');

  useEffect(() => {
    if (!projectId) {
      setState({ phase: 'error', message: 'No project ID provided. Add ?id=... to the URL.' });
      return;
    }

    async function load() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);
        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: `/login?redirect=/dashboard/briefing?id=${projectId}` });
          return;
        }

        const [portalResponse, artifactResult] = await Promise.all([
          fetch(`${getStripeApiUrl('/api/project-home')}?project_id=${encodeURIComponent(projectId!)}`, {
            headers: session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          }),
          createBrowserClient()
            .from('project_artifacts')
            .select('*')
            .eq('project_id', projectId!)
            .order('created_at', { ascending: false }),
        ]);

        const payload = await portalResponse.json() as PortalPayload & { error?: string };
        if (!portalResponse.ok) throw new Error(payload.error ?? 'Unable to load project.');

        setState({
          phase: 'ready',
          email: session.user.email ?? '',
          payload,
          artifacts: (artifactResult.data as ArtifactRecord[] | null) ?? [],
        });
      } catch (error) {
        setState({ phase: 'error', message: error instanceof Error ? error.message : 'Unable to load briefing.' });
      }
    }

    void load();
  }, [projectId]);

  const { completedMilestones, totalMilestones, progressPct, stageIndex, blockers, pendingApprovals, confidenceLabel } = useMemo(() => {
    if (state.phase !== 'ready') return { completedMilestones: 0, totalMilestones: 0, progressPct: 0, stageIndex: 0, blockers: [], pendingApprovals: [], confidenceLabel: '' };
    const { payload } = state;
    const completed = payload.milestones.filter((m) => ['complete', 'completed', 'approved', 'done'].includes((m.status ?? '').toLowerCase())).length;
    const total = payload.milestones.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const si = STAGE_RAIL.findIndex((s) => s.id === normalizeStageId(payload.project.status));
    const bk = payload.awaiting_on_client;
    const pa = payload.approvals.filter((a) => a.status === 'pending');
    const cl = bk.length === 0 && pa.length === 0 ? 'High confidence' : bk.length <= 1 ? 'Medium confidence' : 'Needs attention';
    return { completedMilestones: completed, totalMilestones: total, progressPct: pct, stageIndex: si, blockers: bk, pendingApprovals: pa, confidenceLabel: cl };
  }, [state]);

  if (state.phase === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-body text-tx-muted animate-pulse">Loading briefing…</p></div>;
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-display-sm text-tx-heading">Sign in required</h1>
          <a href={state.redirectUrl} className="mt-6 inline-block bg-brand-teal text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">Sign in</a>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <Badge variant="muted">Error</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Unable to load briefing</h1>
          <p className="mt-3 text-body text-tx-secondary">{state.message}</p>
        </div>
      </div>
    );
  }

  const { payload, email, artifacts } = state;
  const project = payload.project;
  const projectTitle = project.name || project.intake_id || project.id;
  const tierLabel = getCommercialLabel(project.tier ?? project.plan);
  const nextActionLabel = blockers[0]?.detail
    || payload.next_milestone?.title
    || pendingApprovals[0]?.title
    || payload.awaiting_on_us[0]?.detail
    || 'No immediate action required.';

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-bg-offwhite">
      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <p className="text-body-sm text-tx-muted">Una Labs — Client Briefing Board</p>
        <h1 className="text-display-sm text-tx-heading">{projectTitle}</h1>
        <p className="text-body-sm text-tx-muted">Generated {new Date().toLocaleDateString('en-CA')} · {email}</p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 print:py-4 print:px-4">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-6 flex-wrap print:hidden">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="teal">Client Briefing</Badge>
              <Badge variant="muted">{tierLabel}</Badge>
              <Badge variant="muted">{email}</Badge>
            </div>
            <h1 className="mt-4 text-display-sm text-tx-heading">{projectTitle}</h1>
            <p className="mt-2 text-body text-tx-secondary max-w-3xl">{payload.client_status.description}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-lg border border-border text-body-sm font-semibold text-tx-heading hover:bg-bg-subtle transition-colors"
            >
              Print / Save as PDF
            </button>
            <a href={`/portal?id=${project.id}`} className="px-5 py-2.5 rounded-lg bg-brand-teal text-white text-body-sm font-semibold hover:opacity-90 transition-opacity">
              Open client portal →
            </a>
          </div>
        </div>

        {/* Stage Rail */}
        <section className="mb-6 rounded-3xl border border-border bg-white p-6 shadow-sm print:rounded-none print:shadow-none">
          <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Stage rail</p>
          <div className="mt-4">
            <StageRail status={project.status} />
          </div>
          <ProjectClarityCards
            whereLabel={payload.current_phase.title}
            whatIsNext={payload.next_milestone?.title || 'Awaiting next milestone'}
            blockersCount={blockers.length}
            confidenceLabel={confidenceLabel}
          />
        </section>

        {/* Next action + progress */}
        <section className="mb-6 rounded-3xl border border-border bg-white p-6 shadow-sm print:rounded-none print:shadow-none">
          <h2 className="text-h4 text-tx-heading font-semibold">Next action</h2>
          <p className="mt-2 text-body text-tx-secondary">{nextActionLabel}</p>
          <div className="mt-4 rounded-xl border border-border bg-bg-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Progress</p>
              <p className="text-body-sm font-semibold text-tx-heading">{completedMilestones}/{totalMilestones} milestones ({progressPct}%)</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
              <div className="h-full rounded-full bg-brand-teal" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          {blockers.length > 0 && (
            <div className="mt-4 space-y-2">
              {blockers.map((item, idx) => (
                <div key={`${item.title}-${idx}`} className="rounded-lg border border-brand-orange/30 bg-orange-50/50 px-3 py-2">
                  <p className="text-body-sm font-semibold text-tx-heading">{item.title}</p>
                  <p className="text-body-sm text-tx-secondary">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Two-column grid */}
        <div className="grid xl:grid-cols-[1.4fr_.85fr] gap-6">
          <div className="space-y-6">

            {/* Current Phase */}
            <SectionCard title="Current Phase">
              <p className="text-body text-tx-body leading-relaxed">{payload.current_phase.meaning}</p>
              <div className="mt-4 rounded-xl border border-border bg-bg-subtle p-4">
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Expected outcome</p>
                <p className="mt-1 text-body text-tx-heading">{payload.current_phase.expected_outcome}</p>
              </div>
            </SectionCard>

            {/* Milestones */}
            <SectionCard title={`Milestones (${completedMilestones}/${totalMilestones} complete)`}>
              {payload.milestones.length === 0 ? (
                <p className="text-body-sm text-tx-muted">Milestones will appear here once the scoped plan is published.</p>
              ) : (
                <div className="space-y-3">
                  {payload.milestones.map((milestone) => (
                    <MilestoneRow key={milestone.id} milestone={milestone} />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Artifacts and evidence */}
            <SectionCard title="Artifacts and evidence">
              {artifacts.length === 0 && payload.artifacts.length === 0 ? (
                <p className="text-body-sm text-tx-muted">No artifacts captured yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...artifacts, ...payload.artifacts.map((a) => ({ id: a.title, project_id: project.id, ...a }))].map((artifact, idx) => (
                    <div key={`artifact-${idx}`} className="rounded-xl border border-border bg-bg-subtle p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-body-sm font-semibold text-tx-heading">{artifact.title || 'Artifact'}</p>
                        <p className="mt-1 text-body-sm text-tx-secondary capitalize">{(artifact.type || 'artifact').replace(/_/g, ' ')}</p>
                        {artifact.note && <p className="mt-1 text-body-sm text-tx-secondary">{artifact.note}</p>}
                        {artifact.created_at && <p className="mt-1 text-[11px] text-tx-muted">Added {formatDate(artifact.created_at)}</p>}
                      </div>
                      {artifact.url && (
                        <a href={artifact.url} target="_blank" rel="noreferrer" className="text-body-sm font-semibold text-brand-teal hover:underline whitespace-nowrap">View →</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Progress notes */}
            {payload.progress_notes.length > 0 && (
              <SectionCard title="Progress notes">
                <div className="space-y-3">
                  {payload.progress_notes.map((note, idx) => (
                    <div key={`note-${idx}`} className="rounded-xl border border-border bg-bg-subtle p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-body-sm font-semibold text-tx-heading">{note.title}</p>
                        <span className="text-[11px] text-tx-muted">{formatDate(note.created_at)}</span>
                      </div>
                      <p className="mt-1 text-body-sm text-tx-secondary">{note.body}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          <div className="space-y-6">

            {/* KPI summary */}
            <div className="rounded-2xl border border-brand-teal/20 bg-white p-6 shadow-sm">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-4">Executive summary</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="text-body-sm text-tx-secondary">Service tier</p>
                  <p className="text-body-sm font-semibold text-tx-heading">{tierLabel}</p>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="text-body-sm text-tx-secondary">Status</p>
                  <Badge variant={project.status === 'complete' ? 'teal' : 'orange'}>{payload.client_status.label}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="text-body-sm text-tx-secondary">Completion</p>
                  <p className="text-body-sm font-semibold text-tx-heading">{progressPct}%</p>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="text-body-sm text-tx-secondary">Artifacts</p>
                  <p className="text-body-sm font-semibold text-tx-heading">{artifacts.length + payload.artifacts.length}</p>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="text-body-sm text-tx-secondary">Client blockers</p>
                  <p className="text-body-sm font-semibold text-tx-heading">{blockers.length}</p>
                </div>
                <div className="flex justify-between items-center py-2">
                  <p className="text-body-sm text-tx-secondary">Outstanding balance</p>
                  <p className="text-body-sm font-semibold text-tx-heading">{formatMoney(payload.payments.outstanding_balance_cad)}</p>
                </div>
              </div>
            </div>

            {/* Payment status */}
            <SectionCard title="Payment status">
              <div className="space-y-3">
                {[
                  { label: 'Activation fee', value: payload.payments.activation_fee_status || 'not tracked' },
                  { label: 'Build deposit', value: payload.payments.deposit_status || 'not requested' },
                  { label: 'Invoices', value: `${payload.payments.invoices_paid ?? 0} paid / ${payload.payments.invoices_sent ?? 0} sent` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-border bg-bg-subtle p-4">
                    <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">{label}</p>
                    <p className="mt-1 text-body text-tx-heading capitalize">{value}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-border bg-bg-subtle p-4">
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Outstanding balance</p>
                  <p className="mt-1 text-h4 text-tx-heading font-semibold">{formatMoney(payload.payments.outstanding_balance_cad)}</p>
                  {payload.payments.next_payment_link && (
                    <a href={payload.payments.next_payment_link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-body-sm font-semibold text-brand-teal hover:underline">
                      Pay now →
                    </a>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Awaiting on client */}
            {blockers.length > 0 && (
              <SectionCard title="Awaiting on you">
                <div className="space-y-3">
                  {blockers.map((item, idx) => (
                    <div key={`blocker-${idx}`} className="rounded-xl border border-brand-orange/20 bg-orange-50/40 p-4">
                      <p className="text-body-sm font-semibold text-tx-heading">{item.title}</p>
                      <p className="mt-1 text-body-sm text-tx-secondary">{item.detail}</p>
                      {item.action_url && (
                        <a href={item.action_url} className="mt-2 inline-block text-body-sm font-semibold text-brand-teal hover:underline">Open action →</a>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Decisions */}
            {payload.decisions.length > 0 && (
              <SectionCard title="What has been decided">
                <div className="space-y-3">
                  {payload.decisions.map((item, idx) => (
                    <div key={`decision-${idx}`} className="rounded-xl border border-border bg-bg-subtle p-4">
                      <p className="text-body-sm font-semibold text-tx-heading">{item.title}</p>
                      <p className="mt-1 text-body-sm text-tx-secondary">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </div>

        {/* Print footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-border text-body-sm text-tx-muted">
          <p>Una Labs · unalabs.cloud · This briefing was generated on {new Date().toLocaleDateString('en-CA')} for {email}</p>
        </div>
      </div>
    </div>
  );
}
