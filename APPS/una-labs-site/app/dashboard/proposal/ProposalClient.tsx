'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSearchParams } from 'next/navigation';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { getCommercialLabel, isActivationCommercial } from '@/lib/service-engagement';
import { createProposalShareToken } from '@/lib/proposal-share';

type ProjectRecord = {
  id: string;
  name?: string;
  description?: string;
  plan?: string;
  tier?: string;
  billing?: string;
  status?: string;
  ai_price_min_cad?: number | null;
  ai_price_max_cad?: number | null;
  ai_price_rationale?: string | null;
  ai_price_confidence?: string | null;
  ai_price_generated_at?: string | null;
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

function formatPriceRange(min?: number | null, max?: number | null) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return `CA$${Number(min).toLocaleString('en-CA')} - CA$${Number(max).toLocaleString('en-CA')}`;
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

const ADMIN_EMAIL = 'mike.fejiro@gmail.com';

export function ProposalClient({ initialProjectId }: { initialProjectId?: string }) {
  const [state, setState] = useState<ProposalState>({ phase: 'loading' });
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [secureShareState, setSecureShareState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [repriceState, setRepriceState] = useState<'idle' | 'loading' | 'error'>('idle');
  const searchParams = useSearchParams();
  const id = initialProjectId || searchParams.get('id');

  const shareUrl = useMemo(() => {
    if (!id || typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/dashboard/proposal/?id=${encodeURIComponent(id)}`;
  }, [id]);

  const handleReprice = async () => {
    if (!id || !accessToken || state.phase !== 'ready') return;
    setRepriceState('loading');
    try {
      const res = await fetch(getStripeApiUrl(`/api/admin/reprice/${encodeURIComponent(id)}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Reprice request failed');
      const data = await res.json() as {
        ok: boolean;
        ai_price_min_cad: number;
        ai_price_max_cad: number;
        ai_price_rationale: string;
        ai_price_confidence: string;
        ai_price_generated_at: string;
      };
      setState((prev) =>
        prev.phase === 'ready'
          ? {
              ...prev,
              project: {
                ...prev.project,
                ai_price_min_cad: data.ai_price_min_cad,
                ai_price_max_cad: data.ai_price_max_cad,
                ai_price_rationale: data.ai_price_rationale,
                ai_price_confidence: data.ai_price_confidence,
                ai_price_generated_at: data.ai_price_generated_at,
              },
            }
          : prev
      );
      setRepriceState('idle');
    } catch {
      setRepriceState('error');
      window.setTimeout(() => setRepriceState('idle'), 3000);
    }
  };

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

  const handleCreateSecureShare = async () => {
    if (state.phase !== 'ready' || typeof window === 'undefined') {
      setSecureShareState('error');
      return;
    }

    const passcode = window.prompt('Create a passcode for this secure share link (minimum 6 characters).');
    if (!passcode || passcode.trim().length < 6) {
      setSecureShareState('error');
      window.setTimeout(() => setSecureShareState('idle'), 2000);
      return;
    }

    const expiryInput = window.prompt('How many hours should this share link stay valid?', '72');
    const expiryHours = Number(expiryInput || '72');
    if (!Number.isFinite(expiryHours) || expiryHours < 1 || expiryHours > 168) {
      setSecureShareState('error');
      window.setTimeout(() => setSecureShareState('idle'), 2000);
      return;
    }

    try {
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
      const token = await createProposalShareToken(
        {
          scope: 'proposal_read',
          generated_at: new Date().toISOString(),
          expires_at: expiresAt,
          project: state.project,
          milestones: state.milestones,
        },
        passcode.trim(),
      );

      const secureUrl = `${window.location.origin}/proposal/share?token=${encodeURIComponent(token)}`;
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable.');
      }

      await navigator.clipboard.writeText(secureUrl);
      setSecureShareState('copied');
      window.alert('Secure link copied. Share the passcode separately from the URL.');
      window.setTimeout(() => setSecureShareState('idle'), 2000);
    } catch {
      setSecureShareState('error');
      window.setTimeout(() => setSecureShareState('idle'), 2000);
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

        if (session.user.email === ADMIN_EMAIL) {
          setIsAdmin(true);
          setAccessToken(session.access_token ?? null);
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
  const commercialKey = state.project.tier ?? state.project.plan;
  const tierLabel = getCommercialLabel(commercialKey);
  const activationProject = isActivationCommercial(commercialKey);
  const billingLabel = activationProject
    ? 'One-time activation'
    : state.project.billing
      ? `${state.project.billing} billing`
      : 'Billing pending';
  const planPrice = PLAN_PRICES[planKey];
  const monthlyPrice = planPrice
    ? state.project.billing?.toLowerCase() === 'annual'
      ? planPrice.annual
      : planPrice.monthly
    : null;
  const aiPriceRange = formatPriceRange(state.project.ai_price_min_cad, state.project.ai_price_max_cad);
  const holdForReview = !isAdmin && (state.project.status ?? '').toLowerCase() === 'scoped';

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
              {copyState === 'copied' ? 'Link copied' : copyState === 'error' ? 'Copy failed' : 'Copy owner link'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCreateSecureShare}>
              {secureShareState === 'copied' ? 'Secure link copied' : secureShareState === 'error' ? 'Secure share failed' : 'Create secure share link'}
            </Button>
            <Button variant="secondary" size="sm" href={`/dashboard/contract?id=${state.project.id}`}>
              Review Contract
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={handleReprice} disabled={repriceState === 'loading'}>
                {repriceState === 'loading' ? 'Repricing…' : repriceState === 'error' ? 'Reprice failed' : 'Recalculate price'}
              </Button>
            )}
          </div>
        </div>

        {holdForReview ? (
          <div className="mb-16 rounded-2xl border border-border bg-bg-subtle p-8 text-center">
            <Badge variant="orange">Internal review</Badge>
            <h2 className="mt-4 text-h3 text-tx-heading font-semibold">This scope pack has not been published yet</h2>
            <p className="mt-3 text-body text-tx-secondary max-w-2xl mx-auto">
              Your project is active in our onboarding pipeline, but we are still reviewing the scoped plan internally before it is shared here.
            </p>
          </div>
        ) : (
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
              {activationProject ? (
                <p className="text-body text-tx-secondary">Build quote is prepared after scope approval.</p>
              ) : monthlyPrice ? (
                <p className="text-h3 text-tx-heading font-semibold">CA${monthlyPrice}/mo</p>
              ) : (
                <p className="text-body text-tx-secondary">Pricing will appear once plan details are finalized.</p>
              )}
            </div>
            {aiPriceRange && (
              <div className="mb-6 rounded-xl border border-border bg-white p-5">
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">AI Scope Price Insight</p>
                <p className="text-h4 text-tx-heading font-semibold">{aiPriceRange}</p>
                {state.project.ai_price_confidence && (
                  <p className="text-body-sm text-tx-muted capitalize mt-1">{state.project.ai_price_confidence} confidence</p>
                )}
                {state.project.ai_price_rationale && (
                  <p className="text-body text-tx-secondary leading-relaxed mt-2">{state.project.ai_price_rationale}</p>
                )}
              </div>
            )}
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
        )}

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
