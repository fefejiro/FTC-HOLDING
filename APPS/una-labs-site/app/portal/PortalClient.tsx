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

type PortalState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'error'; message: string }
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
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: `/login?redirect=/portal?id=${projectId}` });
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

  const { payload, email } = state;
  const project = payload.project;
  const projectTitle = project.name || project.intake_id || project.id;
  const tierLabel = getCommercialLabel(project.tier ?? project.plan);

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
