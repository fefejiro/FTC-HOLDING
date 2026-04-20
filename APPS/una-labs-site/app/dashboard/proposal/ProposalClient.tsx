'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSearchParams } from 'next/navigation';

type ProjectRecord = {
  id: string;
  name?: string;
  description?: string;
  plan?: string;
  tier?: string;
  billing?: string;
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
};

type ProposalState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; project: ProjectRecord; milestones: MilestoneRecord[] };

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter Plan',
  professional: 'Professional Plan',
  agency: 'Agency Plan',
  enterprise: 'Enterprise Plan',
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 67, annual: 57 },
  professional: { monthly: 135, annual: 108 },
  agency: { monthly: 339, annual: 271 },
  enterprise: { monthly: 679, annual: 543 },
};

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function MilestoneItem({ milestone }: { milestone: MilestoneRecord }) {
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center text-white text-body-sm font-semibold">
          {milestone.title?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <h3 className="text-h4 text-tx-heading font-semibold mb-2">{milestone.title || 'Milestone'}</h3>
          {milestone.description && (
            <p className="text-body text-tx-body leading-relaxed mb-3">{milestone.description}</p>
          )}
          {milestone.due_date && (
            <div className="flex items-center gap-2">
              <p className="text-body-sm text-tx-muted">Due:</p>
              <Badge variant="muted">{formatDate(milestone.due_date)}</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProposalClient({ initialProjectId }: { initialProjectId?: string }) {
  const [state, setState] = useState<ProposalState>({ phase: 'loading' });
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const searchParams = useSearchParams();
  const id = initialProjectId || searchParams.get('id');

  const shareUrl = useMemo(() => {
    if (!id || typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/dashboard/proposal/?id=${encodeURIComponent(id)}`;
  }, [id]);

  const handleCopyLink = async () => {
    if (!shareUrl || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyState('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      setCopyState('error');
    }
  };

  useEffect(() => {
    if (!id) {
      setState({ phase: 'error', message: 'No project ID provided.' });
      return;
    }

    async function loadProposal() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);

        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: `/login?redirect=/dashboard/proposal?id=${id}` });
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
          project: projectResult.data as ProjectRecord,
          milestones: (milestoneResult.data as MilestoneRecord[] | null) ?? [],
        });
      } catch (error) {
        setState({
          phase: 'error',
          message: error instanceof Error ? error.message : 'Unable to load proposal.',
        });
      }
    }

    void loadProposal();
  }, [id]);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading proposal...</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md text-center">
          <Badge variant="muted">Authentication required</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Sign in to view this proposal</h1>
          <p className="mt-4 text-body text-tx-secondary">
            This proposal is only visible to the project owner.
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
          <Badge variant="muted">Error loading proposal</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Unable to load proposal</h1>
          <p className="mt-4 text-body text-tx-secondary">{state.message}</p>
        </div>
      </div>
    );
  }

  const planKey = (state.project.tier ?? state.project.plan ?? '').toLowerCase();
  const tierLabel = TIER_LABELS[planKey] ?? state.project.tier ?? state.project.plan ?? 'Your plan';
  const billingLabel = state.project.billing ? `${state.project.billing} billing` : 'Billing pending';
  const planPrice = PLAN_PRICES[planKey];
  const monthlyPrice = planPrice
    ? state.project.billing?.toLowerCase() === 'annual'
      ? planPrice.annual
      : planPrice.monthly
    : null;

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-display text-tx-heading font-semibold mb-4">
            {state.project.name || `Project ${state.project.id.slice(0, 8)}`}
          </h1>
          <p className="text-body-lg text-tx-secondary">Proposed by Una Labs</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 no-print">
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              {copyState === 'copied' ? 'Link copied' : copyState === 'error' ? 'Copy failed' : 'Copy share link'}
            </Button>
            <Button variant="secondary" size="sm" href={`/dashboard/contract?id=${state.project.id}`}>
              Review Contract
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="mb-16">
          <div className="bg-bg-subtle rounded-2xl p-8 mb-8">
            <h2 className="text-h3 text-tx-heading font-semibold mb-4">Project Overview</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Plan</p>
                <p className="text-body text-tx-heading">{tierLabel}</p>
                <p className="text-body-sm text-tx-secondary mt-1 capitalize">{billingLabel}</p>
              </div>
              <div>
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Status</p>
                <Badge variant="teal">{state.project.status || 'scoped'}</Badge>
              </div>
            </div>
            <div className="mb-6 rounded-xl border border-border bg-white p-5">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Estimated Plan Price</p>
              {monthlyPrice ? (
                <p className="text-h3 text-tx-heading font-semibold">CA${monthlyPrice}/mo</p>
              ) : (
                <p className="text-body text-tx-secondary">Pricing will appear once plan details are finalized.</p>
              )}
            </div>
            {state.project.description && (
              <div>
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-2">Description</p>
                <p className="text-body text-tx-body leading-relaxed">{state.project.description}</p>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-h3 text-tx-heading font-semibold mb-8">Project Milestones</h2>
            {state.milestones.length === 0 ? (
              <p className="text-body text-tx-muted">No milestones defined yet.</p>
            ) : (
              state.milestones.map((milestone) => (
                <MilestoneItem key={milestone.id} milestone={milestone} />
              ))
            )}
          </div>
        </div>

        <div className="text-center border-t border-border pt-12">
          <div className="mb-8 rounded-2xl border border-border bg-bg-subtle p-6 no-print">
            <h2 className="text-h3 text-tx-heading font-semibold">Next step</h2>
            <p className="mt-3 text-body text-tx-body">
              Review the engagement letter to confirm scope, approvals, and working terms before delivery moves forward.
            </p>
            <div className="mt-5 flex justify-center">
              <Button href={`/dashboard/contract?id=${state.project.id}`} variant="primary" size="md">
                Open engagement letter
              </Button>
            </div>
          </div>
          <p className="text-body text-tx-secondary">
            Questions? Contact us at{' '}
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