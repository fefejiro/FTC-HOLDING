'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useSearchParams } from 'next/navigation';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { getCommercialLabel } from '@/lib/service-engagement';

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
  client_status: {
    label: string;
    description: string;
  };
  current_phase: {
    title: string;
    meaning: string;
    expected_outcome: string;
  };
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

type PortalProjectRecord = {
  id: string;
  client_name?: string;
  client_email?: string;
  domain?: string;
  description?: string;
  tier?: string;
  status?: string;
  live_url?: string | null;
  handover_doc?: string | null;
  created_at?: string;
};

type ChangeRequestRecord = {
  id: string;
  project_id: string;
  message: string;
  created_at: string;
  status: string;
};

type PortalState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready_list'; email: string; projects: PortalProjectRecord[]; changeRequests: ChangeRequestRecord[] }
  | { phase: 'ready'; email: string; payload: PortalPayload };

function formatDate(value?: string | null) {
  if (!value) return '-';
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

const STAGE_RAIL: Array<{ id: string; label: string }> = [
  { id: 'intake', label: 'Intake' },
  { id: 'scoped', label: 'Scoping' },
  { id: 'awaiting_approval', label: 'Approval' },
  { id: 'active', label: 'Delivery' },
  { id: 'review', label: 'Client review' },
  { id: 'complete', label: 'Complete' },
  { id: 'support', label: 'Support' },
];

function normalizeStage(status?: string): string {
  const current = (status ?? '').toLowerCase();
  if (!current) return 'intake';
  if (current.includes('awaiting')) return 'awaiting_approval';
  if (current.includes('review')) return 'review';
  if (current.includes('complete') || current.includes('done') || current.includes('delivered')) return 'complete';
  if (current.includes('active') || current.includes('progress') || current.includes('build')) return 'active';
  if (current.includes('scope')) return 'scoped';
  if (current.includes('support')) return 'support';
  if (current.includes('pause')) return 'awaiting_approval';
  return 'intake';
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-h4 text-tx-heading font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function MilestoneStatus({
  milestone,
  clientEmail,
  projectTitle,
  onStatusChange,
}: {
  milestone: MilestoneRecord;
  clientEmail: string;
  projectTitle: string;
  onStatusChange: (id: string, status: string) => void;
}) {
  const status = milestone.status?.toLowerCase() ?? 'pending';
  const isDone = ['complete', 'completed', 'approved', 'done'].includes(status);
  const isReview = status === 'review';
  const isChangesRequested = status === 'changes_requested';
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleAction = async (action: 'approve' | 'changes') => {
    setActionState('loading');

    try {
      const [{ getSession }, { createBrowserClient }] = await Promise.all([
        import('@ftc/auth'),
        import('@ftc/supabase'),
      ]);
      const session = await getSession();
      if (!session?.user) {
        setActionState('error');
        return;
      }

      const supabase = createBrowserClient();
      const newStatus = action === 'approve' ? 'approved' : 'changes_requested';
      const { error } = await supabase
        .from('milestones')
        .update({ status: newStatus, completed_at: action === 'approve' ? new Date().toISOString() : null })
        .eq('id', milestone.id);

      if (error) {
        setActionState('error');
        return;
      }

      await fetch(getStripeApiUrl('/api/milestone-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestone_id: milestone.id,
          milestone_title: milestone.title,
          project_title: projectTitle,
          action,
          notes: notes.trim() || undefined,
          client_email: clientEmail,
        }),
      }).catch(() => undefined);

      if (action === 'approve') {
        fetch(getStripeApiUrl('/api/invoices/generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ milestone_id: milestone.id }),
        }).catch(() => undefined);
      }

      setActionState('done');
      onStatusChange(milestone.id, newStatus);
    } catch {
      setActionState('error');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-subtle p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-tx-heading">{milestone.title || 'Milestone'}</p>
          {milestone.description && <p className="mt-1 text-body-sm text-tx-secondary">{milestone.description}</p>}
        </div>
        <Badge variant={isDone ? 'teal' : isReview || isChangesRequested ? 'orange' : 'muted'}>{milestone.status || 'pending'}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3 text-body-sm text-tx-muted flex-wrap">
        <span>Due {formatDate(milestone.due_date)}</span>
        {milestone.completed_at && isDone && <span>Completed {formatDate(milestone.completed_at)}</span>}
      </div>
      {(milestone.proof_url || milestone.proof_note) && (
        <div className="mt-3 rounded-lg border border-brand-teal/30 bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">Latest artifact</p>
          {milestone.proof_note && <p className="mt-1 text-body-sm text-tx-body">{milestone.proof_note}</p>}
          {milestone.proof_url && (
            <a href={milestone.proof_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-body-sm font-semibold text-brand-teal hover:underline">
              Open proof link
            </a>
          )}
        </div>
      )}
      {isReview && actionState === 'idle' && (
        <div className="mt-3 space-y-2">
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe what needs to change..."
              className="w-full px-3 py-2 text-body-sm border border-border rounded-lg focus:outline-none focus:border-border-focus resize-none"
            />
          )}
          <div className="flex gap-2">
            <button onClick={() => void handleAction('approve')} className="flex-1 px-3 py-2 bg-brand-teal text-white text-body-sm font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors">
              Approve
            </button>
            <button onClick={() => showNotes ? void handleAction('changes') : setShowNotes(true)} className="flex-1 px-3 py-2 border border-red-300 text-red-600 text-body-sm font-semibold rounded-lg hover:bg-red-50 transition-colors">
              {showNotes ? 'Send feedback' : 'Request changes'}
            </button>
          </div>
        </div>
      )}
      {actionState === 'loading' && <p className="mt-3 text-body-sm text-tx-muted animate-pulse">Saving...</p>}
      {actionState === 'done' && <p className="mt-3 text-body-sm text-brand-teal font-medium">Saved. We have the update.</p>}
      {actionState === 'error' && <p className="mt-3 text-body-sm text-red-500">Something went wrong. Try refreshing.</p>}
    </div>
  );
}

export function PortalClient({ initialProjectId }: { initialProjectId?: string }) {
  const [state, setState] = useState<PortalState>({ phase: 'loading' });
  const [milestoneOverrides, setMilestoneOverrides] = useState<Record<string, string>>({});
  const [changeRequestDrafts, setChangeRequestDrafts] = useState<Record<string, string>>({});
  const [changeRequestStates, setChangeRequestStates] = useState<Record<string, 'idle' | 'saving' | 'done' | 'error'>>({});
  const searchParams = useSearchParams();
  const id = initialProjectId || searchParams.get('id');

  useEffect(() => {
    if (!id) {
      setState({ phase: 'error', message: 'No project ID provided.' });
      return;
    }
    const projectId = id;

    async function loadPortal() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);
        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: projectId ? `/login?redirect=/portal?id=${projectId}` : '/login?redirect=/portal' });
          return;
        }

        if (!projectId) {
          const client = createBrowserClient();
          const email = session.user.email ?? '';
          const { data: projects, error: projectError } = await client
            .from('projects')
            .select('*')
            .eq('client_email', email)
            .order('created_at', { ascending: false });

          if (projectError) {
            throw projectError;
          }

          const projectIds = ((projects as PortalProjectRecord[] | null) ?? []).map((project) => project.id);
          const changeRequestResult = projectIds.length > 0
            ? await client
                .from('change_requests')
                .select('*')
                .in('project_id', projectIds)
                .order('created_at', { ascending: false })
            : { data: [] as ChangeRequestRecord[] | null, error: null };

          if (changeRequestResult.error) {
            throw changeRequestResult.error;
          }

          setState({
            phase: 'ready_list',
            email,
            projects: (projects as PortalProjectRecord[] | null) ?? [],
            changeRequests: (changeRequestResult.data as ChangeRequestRecord[] | null) ?? [],
          });
          return;
        }

        const response = await fetch(`${getStripeApiUrl('/api/project-home')}?project_id=${encodeURIComponent(projectId)}`, {
          headers: {
            ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        });
        const payload = await response.json() as PortalPayload & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load project portal.');
        }

        setState({
          phase: 'ready',
          email: session.user.email ?? '',
          payload,
        });
      } catch (error) {
        setState({
          phase: 'error',
          message: error instanceof Error ? error.message : 'Unable to load project portal.',
        });
      }
    }

    void loadPortal();
  }, [id]);

  const handleChangeRequestSubmit = async (projectId: string) => {
    const message = (changeRequestDrafts[projectId] || '').trim();
    if (!message) return;

    setChangeRequestStates((previous) => ({ ...previous, [projectId]: 'saving' }));
    try {
      const { createBrowserClient } = await import('@ftc/supabase');
      const client = createBrowserClient();
      const { data, error } = await client
        .from('change_requests')
        .insert({ project_id: projectId, message, status: 'open' })
        .select('*')
        .single();

      if (error || !data) {
        throw error || new Error('Could not save change request.');
      }

      setState((previous) => previous.phase !== 'ready_list'
        ? previous
        : {
            ...previous,
            changeRequests: [data as ChangeRequestRecord, ...previous.changeRequests],
          });
      setChangeRequestDrafts((previous) => ({ ...previous, [projectId]: '' }));
      setChangeRequestStates((previous) => ({ ...previous, [projectId]: 'done' }));
    } catch {
      setChangeRequestStates((previous) => ({ ...previous, [projectId]: 'error' }));
    }
  };

  const milestones = useMemo(() => {
    if (state.phase !== 'ready') return [];
    return state.payload.milestones.map((milestone) => ({
      ...milestone,
      status: milestoneOverrides[milestone.id] ?? milestone.status,
    }));
  }, [state, milestoneOverrides]);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading project portal...</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md text-center">
          <Badge variant="muted">Authentication required</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Sign in to view your project</h1>
          <p className="mt-4 text-body text-tx-secondary">This portal is only visible to the project owner.</p>
          <div className="mt-6">
            <a href={state.redirectUrl} className="inline-block bg-brand-teal text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md text-center">
          <Badge variant="muted">Error loading portal</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Unable to load project portal</h1>
          <p className="mt-4 text-body text-tx-secondary">{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'ready_list') {
    return (
      <div className="min-h-screen bg-bg-offwhite">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="teal">Client Portal</Badge>
                <Badge variant="muted">{state.email}</Badge>
              </div>
              <h1 className="mt-4 text-display-sm text-tx-heading">Your projects</h1>
              <p className="mt-3 text-body text-tx-secondary">Track status, grab your handover doc, and send change requests without waiting for email back-and-forth.</p>
            </div>
          </div>

          {state.projects.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
              <h2 className="text-h3 text-tx-heading">No tracked projects yet</h2>
              <p className="mt-3 text-body text-tx-secondary">Once your intake is submitted, your project will appear here automatically.</p>
              <div className="mt-6">
                <a href="/start" className="inline-flex items-center justify-center rounded-lg bg-brand-orange px-6 py-3 text-body font-semibold text-white">
                  Start your project
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid gap-6">
              {state.projects.map((project) => {
                const requests = state.changeRequests.filter((request) => request.project_id === project.id);
                const requestState = changeRequestStates[project.id] || 'idle';
                return (
                  <section key={project.id} className="rounded-3xl border border-border bg-white p-8 shadow-sm">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant={project.status === 'live' ? 'teal' : project.status === 'paused' ? 'muted' : 'orange'}>
                            {project.status || 'scoping'}
                          </Badge>
                          {project.tier && <Badge variant="muted">{project.tier}</Badge>}
                        </div>
                        <h2 className="mt-4 text-h3 text-tx-heading">{project.client_name || project.client_email || 'Project'}</h2>
                        {project.description && <p className="mt-3 text-body text-tx-secondary max-w-3xl">{project.description}</p>}
                      </div>
                      <div className="text-body-sm text-tx-muted">
                        <p>Started {formatDate(project.created_at)}</p>
                        {project.domain && <p className="mt-1">{project.domain}</p>}
                      </div>
                    </div>

                    <div className="mt-6 grid md:grid-cols-3 gap-4">
                      <div className="rounded-xl border border-border bg-bg-subtle p-4">
                        <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Current status</p>
                        <p className="mt-2 text-body text-tx-heading capitalize">{project.status || 'scoping'}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-bg-subtle p-4">
                        <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Live URL</p>
                        <p className="mt-2 text-body text-tx-heading break-all">{project.live_url || 'Not live yet'}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-bg-subtle p-4">
                        <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Handover</p>
                        {project.handover_doc ? (
                          <button
                            type="button"
                            onClick={() => {
                              const blob = new Blob([project.handover_doc || ''], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `${(project.client_name || 'project').replace(/\s+/g, '-').toLowerCase()}-handover.txt`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="mt-2 text-body-sm font-semibold text-brand-teal hover:underline"
                          >
                            Download handover doc
                          </button>
                        ) : (
                          <p className="mt-2 text-body text-tx-heading">Not generated yet</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 grid lg:grid-cols-[1.2fr_.8fr] gap-6">
                      <div>
                        <p className="text-body font-semibold text-tx-heading">Request a change</p>
                        <textarea
                          value={changeRequestDrafts[project.id] || ''}
                          onChange={(event) => setChangeRequestDrafts((previous) => ({ ...previous, [project.id]: event.target.value }))}
                          rows={4}
                          placeholder="Describe the change you need."
                          className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-body text-tx-body focus:outline-none focus:border-border-focus resize-y"
                        />
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => void handleChangeRequestSubmit(project.id)}
                            disabled={requestState === 'saving'}
                            className="rounded-lg bg-brand-teal px-5 py-3 text-body-sm font-semibold text-white disabled:opacity-50"
                          >
                            {requestState === 'saving' ? 'Sending…' : 'Submit request'}
                          </button>
                          {requestState === 'done' && <span className="text-body-sm text-brand-teal">Saved.</span>}
                          {requestState === 'error' && <span className="text-body-sm text-red-500">Could not save request.</span>}
                        </div>
                      </div>

                      <div>
                        <p className="text-body font-semibold text-tx-heading">Recent requests</p>
                        <div className="mt-3 space-y-3">
                          {requests.length === 0 ? (
                            <div className="rounded-xl border border-border bg-bg-subtle p-4 text-body-sm text-tx-muted">
                              No requests submitted yet.
                            </div>
                          ) : requests.map((request) => (
                            <div key={request.id} className="rounded-xl border border-border bg-bg-subtle p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-body-sm font-semibold text-tx-heading capitalize">{request.status}</p>
                                <span className="text-[11px] text-tx-muted">{formatDate(request.created_at)}</span>
                              </div>
                              <p className="mt-2 text-body-sm text-tx-secondary">{request.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const { payload, email } = state;
  const project = payload.project;
  const projectTitle = project.name || project.intake_id || project.id;
  const tierLabel = getCommercialLabel(project.tier ?? project.plan);
  const stageId = normalizeStage(project.status);
  const stageIndex = STAGE_RAIL.findIndex((stage) => stage.id === stageId);
  const completedMilestones = milestones.filter((milestone) => {
    const status = (milestone.status ?? '').toLowerCase();
    return ['complete', 'completed', 'approved', 'done'].includes(status);
  }).length;
  const progressPct = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;
  const blockers = payload.awaiting_on_client;
  const pendingApprovals = payload.approvals.filter((approval) => approval.status === 'pending');
  const confidenceLabel = blockers.length === 0 && pendingApprovals.length === 0
    ? 'High confidence'
    : blockers.length <= 1
      ? 'Medium confidence'
      : 'Needs attention';
  const nextAction = blockers[0]?.detail
    || payload.next_milestone?.title
    || pendingApprovals[0]?.title
    || payload.awaiting_on_us[0]?.detail
    || 'No immediate action required. We will notify you on the next update.';

  return (
    <div className="min-h-screen bg-bg-offwhite">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="teal">{payload.client_status.label}</Badge>
            <Badge variant="muted">{tierLabel}</Badge>
          </div>
          <h1 className="mt-4 text-display-sm text-tx-heading">{projectTitle}</h1>
          <p className="mt-3 text-body text-tx-secondary max-w-3xl">{payload.client_status.description}</p>
        </div>

        <section className="mb-6 rounded-3xl border border-border bg-white p-6 shadow-sm">
          <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Stage rail</p>
          <div className="mt-4 grid gap-3 md:grid-cols-7">
            {STAGE_RAIL.map((stage, index) => {
              const active = index === stageIndex;
              const done = index < stageIndex;
              return (
                <div key={stage.id} className="rounded-xl border border-border px-3 py-3 bg-bg-subtle">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-brand-teal' : done ? 'text-tx-heading' : 'text-tx-muted'}`}>
                    {done ? 'Done' : active ? 'Current' : 'Upcoming'}
                  </p>
                  <p className={`mt-1 text-body-sm font-semibold ${active ? 'text-brand-teal' : 'text-tx-heading'}`}>
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-bg-subtle p-4">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Where are we</p>
              <p className="mt-1 text-body font-semibold text-tx-heading">{payload.current_phase.title}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-subtle p-4">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">What is next</p>
              <p className="mt-1 text-body font-semibold text-tx-heading">{payload.next_milestone?.title || 'Awaiting next milestone'}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-subtle p-4">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">What is blocked</p>
              <p className="mt-1 text-body font-semibold text-tx-heading">{blockers.length} client action{blockers.length === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-subtle p-4">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Confidence</p>
              <p className="mt-1 text-body font-semibold text-tx-heading">{confidenceLabel}</p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-h4 text-tx-heading font-semibold">Next action center</h2>
          <p className="mt-2 text-body text-tx-secondary">{nextAction}</p>
          <div className="mt-4 rounded-xl border border-border bg-bg-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Progress</p>
              <p className="text-body-sm font-semibold text-tx-heading">{completedMilestones}/{milestones.length} milestones ({progressPct}%)</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
              <div className="h-full rounded-full bg-brand-teal" style={{ width: `${progressPct}%` }} />
            </div>
            {blockers.length > 0 && (
              <div className="mt-4 space-y-2">
                {blockers.slice(0, 2).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-lg border border-brand-orange/30 bg-orange-50/50 px-3 py-2">
                    <p className="text-body-sm font-semibold text-tx-heading">{item.title}</p>
                    <p className="text-body-sm text-tx-secondary">{item.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="grid xl:grid-cols-[1.25fr_.85fr] gap-6">
          <div className="space-y-6">
            <SectionCard title="Project Overview">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Service type</p>
                  <p className="mt-1 text-body text-tx-heading">{tierLabel}</p>
                </div>
                <div>
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Started</p>
                  <p className="mt-1 text-body text-tx-heading">{formatDate(project.created_at)}</p>
                </div>
                <div>
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Current status</p>
                  <p className="mt-1 text-body text-tx-heading">{payload.client_status.label}</p>
                </div>
                <div>
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Project owner</p>
                  <p className="mt-1 text-body text-tx-heading">{email}</p>
                </div>
              </div>
              {project.description && <p className="mt-5 text-body text-tx-body leading-relaxed">{project.description}</p>}
            </SectionCard>

            <SectionCard title="Current Phase">
              <p className="text-body text-tx-body leading-relaxed">{payload.current_phase.meaning}</p>
              <div className="mt-4 rounded-xl border border-border bg-bg-subtle p-4">
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Expected outcome</p>
                <p className="mt-1 text-body text-tx-heading">{payload.current_phase.expected_outcome}</p>
              </div>
            </SectionCard>

            <SectionCard title="What Has Been Decided">
              <div className="space-y-4">
                {payload.decisions.map((item) => (
                  <div key={item.title} className="rounded-xl border border-border bg-bg-subtle p-4">
                    <p className="text-body-sm font-semibold text-tx-heading">{item.title}</p>
                    <p className="mt-1 text-body-sm text-tx-secondary leading-relaxed">{item.detail}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="grid md:grid-cols-2 gap-6">
              <SectionCard title="Awaiting on Us">
                <div className="space-y-3">
                  {payload.awaiting_on_us.length === 0 ? (
                    <p className="text-body-sm text-tx-muted">Nothing is blocked on our side right now.</p>
                  ) : payload.awaiting_on_us.map((item) => (
                    <div key={item.title} className="rounded-xl border border-border bg-bg-subtle p-4">
                      <p className="text-body-sm font-semibold text-tx-heading">{item.title}</p>
                      <p className="mt-1 text-body-sm text-tx-secondary">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Awaiting on You">
                <div className="space-y-3">
                  {payload.awaiting_on_client.length === 0 ? (
                    <p className="text-body-sm text-tx-muted">No client actions are blocking progress right now.</p>
                  ) : payload.awaiting_on_client.map((item) => (
                    <div key={item.title} className="rounded-xl border border-brand-orange/20 bg-orange-50/40 p-4">
                      <p className="text-body-sm font-semibold text-tx-heading">{item.title}</p>
                      <p className="mt-1 text-body-sm text-tx-secondary">{item.detail}</p>
                      {item.action_url && (
                        <a href={item.action_url} className="mt-2 inline-block text-body-sm font-semibold text-brand-teal hover:underline">
                          Open action
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Latest Artifacts">
              <div className="space-y-3">
                {payload.artifacts.length === 0 ? (
                  <p className="text-body-sm text-tx-muted">Artifacts will appear here as the project moves forward.</p>
                ) : payload.artifacts.map((artifact, index) => (
                  <div key={`${artifact.title}-${index}`} className="rounded-xl border border-border bg-bg-subtle p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-body-sm font-semibold text-tx-heading">{artifact.title}</p>
                      <p className="mt-1 text-body-sm text-tx-secondary capitalize">{artifact.type.replace(/_/g, ' ')}</p>
                      {artifact.note && <p className="mt-1 text-body-sm text-tx-secondary">{artifact.note}</p>}
                      {artifact.created_at && <p className="mt-1 text-[11px] text-tx-muted">Added {formatDate(artifact.created_at)}</p>}
                    </div>
                    {artifact.url && (
                      <a href={artifact.url} target="_blank" rel="noreferrer" className="text-body-sm font-semibold text-brand-teal hover:underline whitespace-nowrap">
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Latest Progress Notes">
              <div className="space-y-3">
                {payload.progress_notes.map((note, index) => (
                  <div key={`${note.title}-${index}`} className="rounded-xl border border-border bg-bg-subtle p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-body-sm font-semibold text-tx-heading">{note.title}</p>
                      <span className="text-[11px] text-tx-muted">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="mt-1 text-body-sm text-tx-secondary">{note.body}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Payment Status">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-bg-subtle p-4">
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Activation fee</p>
                  <p className="mt-1 text-body text-tx-heading capitalize">{payload.payments.activation_fee_status || 'not tracked'}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg-subtle p-4">
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Build deposit</p>
                  <p className="mt-1 text-body text-tx-heading capitalize">{payload.payments.deposit_status || 'not requested'}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg-subtle p-4">
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Invoices</p>
                  <p className="mt-1 text-body text-tx-heading">{payload.payments.invoices_paid ?? 0} paid / {payload.payments.invoices_sent ?? 0} sent</p>
                </div>
                <div className="rounded-xl border border-border bg-bg-subtle p-4">
                  <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Outstanding balance</p>
                  <p className="mt-1 text-h4 text-tx-heading font-semibold">{formatMoney(payload.payments.outstanding_balance_cad)}</p>
                  {payload.payments.next_payment_link && (
                    <a href={payload.payments.next_payment_link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-body-sm font-semibold text-brand-teal hover:underline">
                      Pay now
                    </a>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Next Milestone">
              {payload.next_milestone ? (
                <div className="rounded-xl border border-border bg-bg-subtle p-4">
                  <p className="text-body font-semibold text-tx-heading">{payload.next_milestone.title || 'Upcoming milestone'}</p>
                  {payload.next_milestone.description && <p className="mt-1 text-body-sm text-tx-secondary">{payload.next_milestone.description}</p>}
                  <p className="mt-3 text-body-sm text-tx-muted">Due {formatDate(payload.next_milestone.due_date)}</p>
                </div>
              ) : (
                <p className="text-body-sm text-tx-muted">No next milestone is queued yet.</p>
              )}
            </SectionCard>

            <SectionCard title="Approvals">
              <div className="space-y-3">
                {payload.approvals.map((approval) => (
                  <div key={approval.title} className="rounded-xl border border-border bg-bg-subtle p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-body-sm font-semibold text-tx-heading">{approval.title}</p>
                      <Badge variant={approval.status === 'approved' ? 'teal' : approval.status === 'pending' ? 'orange' : 'muted'}>
                        {approval.status}
                      </Badge>
                    </div>
                    {approval.action_url && (
                      <a href={approval.action_url} className="mt-2 inline-block text-body-sm font-semibold text-brand-teal hover:underline">
                        Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Milestones">
              <div className="space-y-4">
                {milestones.length === 0 ? (
                  <p className="text-body-sm text-tx-muted">Milestones will appear here once the scoped plan is published.</p>
                ) : milestones.map((milestone) => (
                  <MilestoneStatus
                    key={milestone.id}
                    milestone={milestone}
                    clientEmail={email}
                    projectTitle={projectTitle}
                    onStatusChange={(milestoneId, newStatus) => setMilestoneOverrides((prev) => ({ ...prev, [milestoneId]: newStatus }))}
                  />
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
