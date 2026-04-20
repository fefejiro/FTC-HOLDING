'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useSearchParams } from 'next/navigation';
import { STRIPE_API_URL } from '@/lib/stripe-config';

type ProjectRecord = {
  id: string;
  intake_id?: string;
  name?: string;
  description?: string;
  plan?: string;
  status?: string;
  created_at?: string;
};

type MilestoneRecord = {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  due_date?: string;
  status?: string;
  created_at?: string;
  completed_at?: string | null;
  proof_url?: string;
  proof_note?: string;
};

type PortalState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; project: ProjectRecord; milestones: MilestoneRecord[] };

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter Plan',
  professional: 'Professional Plan',
  agency: 'Agency Plan',
  enterprise: 'Enterprise Plan',
};

const STATUS_MESSAGES: Record<string, { title: string; description: string; variant: 'teal' | 'orange' | 'muted' }> = {
  intake: {
    title: 'Project Intake',
    description: 'We\'re reviewing your requirements and preparing a detailed proposal.',
    variant: 'teal',
  },
  scoped: {
    title: 'Proposal Ready',
    description: 'Your project proposal is ready for review. We\'ll send you a link to view it.',
    variant: 'orange',
  },
  active: {
    title: 'Project Active',
    description: 'Your project is currently in development. Check back for updates.',
    variant: 'orange',
  },
  review: {
    title: 'Under Review',
    description: 'Your project is being reviewed for quality assurance.',
    variant: 'orange',
  },
  complete: {
    title: 'Project Complete',
    description: 'Your project has been completed successfully!',
    variant: 'teal',
  },
  paused: {
    title: 'Project Paused',
    description: 'Your project is currently paused. Contact us for updates.',
    variant: 'muted',
  },
};

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
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
  const isComplete = milestone.status === 'complete';
  const isInProgress = milestone.status === 'in_progress';
  const isApproved = milestone.status === 'approved';
  const isDone = isComplete || isApproved;
  const isReview = milestone.status === 'review';
  const isChangesRequested = milestone.status === 'changes_requested';
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

      await fetch(`${STRIPE_API_URL}/api/milestone-action`, {
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
      }).catch(() => {
        // Do not block the client flow if notification delivery fails.
      });

      if (action === 'approve') {
        fetch(`${STRIPE_API_URL}/api/invoices/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ milestone_id: milestone.id }),
        }).catch(() => {
          // Non-fatal. Invoice generation can be retried server-side.
        });
      }

      setActionState('done');
      onStatusChange(milestone.id, newStatus);
    } catch {
      setActionState('error');
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-bg-subtle rounded-lg">
      <div className="flex-shrink-0 mt-0.5">
        <div className={`w-6 h-6 rounded-full border-2 ${isDone ? 'bg-brand-teal border-brand-teal' : isInProgress ? 'border-brand-orange' : 'border-border'}`}>
          {isDone && (
            <svg className="w-4 h-4 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1">
        <h4 className="text-body font-semibold text-tx-heading mb-1">{milestone.title || 'Milestone'}</h4>
        {milestone.description && (
          <p className="text-body-sm text-tx-secondary mb-2">{milestone.description}</p>
        )}
        <div className="flex items-center gap-2">
          <Badge variant={isDone ? 'teal' : isInProgress || isReview ? 'orange' : isChangesRequested ? 'orange' : 'muted'}>
            {milestone.status || 'pending'}
          </Badge>
          {milestone.due_date && (
            <span className="text-body-sm text-tx-muted">Due {formatDate(milestone.due_date)}</span>
          )}
        </div>

        {(milestone.proof_url || milestone.proof_note) && (
          <div className="mt-3 rounded-lg border border-brand-teal/30 bg-white px-3 py-2 flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">Delivery proof</p>
            {milestone.proof_note && <p className="text-body-sm text-tx-body">{milestone.proof_note}</p>}
            {milestone.proof_url && (
              <a href={milestone.proof_url} target="_blank" rel="noreferrer" className="text-body-sm font-semibold text-brand-teal hover:underline break-all">
                Open proof link
              </a>
            )}
          </div>
        )}

        {isReview && actionState === 'idle' && (
          <div className="mt-3 flex flex-col gap-2">
            {showNotes && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what needs to change..."
                rows={3}
                className="w-full px-3 py-2 text-body-sm border border-border rounded-lg focus:outline-none focus:border-border-focus resize-none"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleAction('approve')}
                className="flex-1 px-3 py-2 bg-brand-teal text-white text-body-sm font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => (showNotes ? handleAction('changes') : setShowNotes(true))}
                className="flex-1 px-3 py-2 border border-red-300 text-red-600 text-body-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
              >
                {showNotes ? 'Send feedback' : 'Request changes'}
              </button>
            </div>

            {showNotes && (
              <button onClick={() => setShowNotes(false)} className="text-body-sm text-tx-muted hover:text-tx-secondary text-center">
                Cancel
              </button>
            )}
          </div>
        )}

        {isReview && actionState === 'loading' && <p className="mt-3 text-body-sm text-tx-muted animate-pulse">Saving...</p>}
        {isReview && actionState === 'done' && <p className="mt-3 text-body-sm text-brand-teal font-medium">Saved - we've been notified.</p>}
        {actionState === 'error' && <p className="mt-3 text-body-sm text-red-500">Something went wrong. Try refreshing.</p>}
        {(isApproved || actionState === 'done') && (
          <a
            href={`/dashboard/invoice?milestone_id=${milestone.id}`}
            className="mt-2 block text-[11px] font-semibold text-brand-teal hover:underline"
          >
            View Invoice -&gt;
          </a>
        )}
      </div>
    </div>
  );
}

export function PortalClient({ initialProjectId }: { initialProjectId?: string }) {
  const [state, setState] = useState<PortalState>({ phase: 'loading' });
  const searchParams = useSearchParams();
  const id = initialProjectId || searchParams.get('id');

  useEffect(() => {
    if (!id) {
      setState({ phase: 'error', message: 'No project ID provided.' });
      return;
    }

    async function loadPortal() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);

        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: `/login?redirect=/portal?id=${id}` });
          return;
        }

        const client = createBrowserClient();

        const [projectResult, milestoneResult] = await Promise.all([
          client.from('projects').select('*').eq('id', id).single(),
          client.from('milestones').select('*').eq('project_id', id).order('due_date', { ascending: true }),
        ]);

        if (projectResult.error) throw projectResult.error;
        if (milestoneResult.error) throw milestoneResult.error;

        setState({
          phase: 'ready',
          email: session.user.email ?? '',
          project: projectResult.data as ProjectRecord,
          milestones: (milestoneResult.data as MilestoneRecord[] | null) ?? [],
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
          <p className="mt-4 text-body text-tx-secondary">
            This portal is only visible to the project owner.
          </p>
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

  const tierLabel = TIER_LABELS[state.project.plan?.toLowerCase() ?? ''] ?? state.project.plan ?? 'Your plan';
  const statusInfo = STATUS_MESSAGES[state.project.status?.toLowerCase() ?? 'intake'] ?? STATUS_MESSAGES.intake;
  const projectTitle = state.project.name || state.project.intake_id || state.project.id;

  const handleMilestoneStatusChange = (milestoneId: string, newStatus: string) => {
    setState((previous) => {
      if (previous.phase !== 'ready') return previous;

      return {
        ...previous,
        milestones: previous.milestones.map((milestone) => (
          milestone.id === milestoneId
            ? {
                ...milestone,
                status: newStatus,
                completed_at: newStatus === 'approved' ? new Date().toISOString() : null,
              }
            : milestone
        )),
      };
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-display text-tx-heading font-semibold mb-4">
            {state.project.name || `Project ${state.project.id.slice(0, 8)}`}
          </h1>
          <p className="text-body-lg text-tx-secondary">Project Portal</p>
        </div>

        <div className="mb-16">
          <div className="bg-bg-subtle rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-h3 text-tx-heading font-semibold">Current Status</h2>
              <Badge variant={statusInfo.variant}>{state.project.status || 'intake'}</Badge>
            </div>
            <h3 className="text-h4 text-tx-heading font-semibold mb-2">{statusInfo.title}</h3>
            <p className="text-body text-tx-body leading-relaxed">{statusInfo.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Plan</p>
              <p className="text-body text-tx-heading">{tierLabel}</p>
            </div>
            <div>
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Started</p>
              <p className="text-body text-tx-heading">{formatDate(state.project.created_at)}</p>
            </div>
          </div>

          {state.project.description && (
            <div className="mb-8">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-2">Description</p>
              <p className="text-body text-tx-body leading-relaxed">{state.project.description}</p>
            </div>
          )}

          <div className="mb-8 rounded-2xl border border-border bg-bg-subtle p-6">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-h3 text-tx-heading font-semibold">Engagement Letter</h2>
              <Badge variant="orange">Review and sign</Badge>
            </div>
            <p className="text-body text-tx-body leading-relaxed">
              Your contract confirms the scope, delivery model, approvals, and working terms for this project.
            </p>
            <div className="mt-5">
              <a
                href={`/dashboard/contract?id=${state.project.id}`}
                className="inline-flex items-center justify-center rounded-lg bg-brand-orange px-6 py-3 text-body font-semibold text-white hover:bg-brand-orange-hover transition-colors"
              >
                Open engagement letter
              </a>
            </div>
          </div>

          {state.milestones.length > 0 && (
            <div>
              <h2 className="text-h3 text-tx-heading font-semibold mb-6">Milestones</h2>
              <div className="space-y-4">
                {state.milestones.map((milestone) => (
                  <MilestoneStatus
                    key={milestone.id}
                    milestone={milestone}
                    clientEmail={state.email}
                    projectTitle={projectTitle}
                    onStatusChange={handleMilestoneStatusChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-center border-t border-border pt-12">
          <p className="text-body text-tx-secondary">
            Need help? Contact us at{' '}
            <a href="mailto:hello@unalabs.cloud" className="text-brand-teal hover:underline">
              hello@unalabs.cloud
            </a>
          </p>
          <p className="text-body-sm text-tx-muted mt-2">Powered by Una Labs · unalabs.cloud</p>
        </div>
      </div>
    </div>
  );
}