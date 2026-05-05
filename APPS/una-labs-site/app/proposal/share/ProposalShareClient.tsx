'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getCommercialLabel, isActivationCommercial } from '@/lib/service-engagement';
import { readProposalShareToken, type ProposalShareSnapshot } from '@/lib/proposal-share';

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

export function ProposalShareClient() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<ProposalShareSnapshot | null>(null);

  const headerTitle = useMemo(() => {
    if (!snapshot) return 'Secure proposal access';
    return snapshot.project.name || `Project ${snapshot.project.id.slice(0, 8)}`;
  }, [snapshot]);

  async function handleUnlock() {
    if (!token) {
      setError('No share token found in this link.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const value = await readProposalShareToken(token, passcode);
      setSnapshot(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock this proposal.');
    } finally {
      setLoading(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl border border-border bg-bg-offwhite p-8 shadow-sm">
          <Badge variant="teal">Stakeholder share</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">{headerTitle}</h1>
          <p className="mt-3 text-body text-tx-secondary">
            This proposal snapshot is protected. Enter the passcode shared with this link to view scope, pricing, and milestones.
          </p>
          <label className="block mt-6">
            <span className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Passcode</span>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="mt-2 w-full rounded-lg border border-border px-4 py-3 text-body text-tx-heading focus:outline-none focus:border-border-focus"
              placeholder="Enter share passcode"
            />
          </label>
          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-600">{error}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" size="md" onClick={handleUnlock} disabled={loading}>
              {loading ? 'Unlocking...' : 'Unlock proposal'}
            </Button>
            <Button variant="secondary" size="md" href="/start-project">
              Start your project
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const commercialKey = snapshot.project.tier ?? snapshot.project.plan;
  const tierLabel = getCommercialLabel(commercialKey);
  const activationProject = isActivationCommercial(commercialKey);
  const billingLabel = activationProject
    ? 'One-time activation'
    : snapshot.project.billing
      ? `${snapshot.project.billing} billing`
      : 'Billing pending';
  const planKey = (snapshot.project.tier ?? snapshot.project.plan ?? '').toLowerCase();
  const planPrice = PLAN_PRICES[planKey];
  const monthlyPrice = planPrice
    ? snapshot.project.billing?.toLowerCase() === 'annual'
      ? planPrice.annual
      : planPrice.monthly
    : null;
  const aiPriceRange = formatPriceRange(snapshot.project.ai_price_min_cad, snapshot.project.ai_price_max_cad);

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <Badge variant="teal">Shared proposal snapshot</Badge>
          <h1 className="mt-4 text-display text-tx-heading font-semibold">{headerTitle}</h1>
          <p className="mt-3 text-body text-tx-secondary">Generated {formatDate(snapshot.generated_at)} · Expires {formatDate(snapshot.expires_at)}</p>
          <div className="mt-5 flex justify-center gap-3 no-print flex-wrap">
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
            <Button variant="secondary" size="sm" href="/start-project">
              Start a project
            </Button>
            <Button variant="secondary" size="sm" href="mailto:hello@unalabs.cloud?subject=Proposal%20questions">
              Contact Una Labs
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-bg-subtle p-8 mb-8">
          <h2 className="text-h3 text-tx-heading font-semibold mb-4">Proposal summary</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Plan</p>
              <p className="text-body text-tx-heading">{tierLabel}</p>
              <p className="text-body-sm text-tx-secondary mt-1 capitalize">{billingLabel}</p>
            </div>
            <div>
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Status snapshot</p>
              <Badge variant="teal">{snapshot.project.status || 'scoped'}</Badge>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-border bg-white p-5">
            <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Pricing snapshot</p>
            {activationProject ? (
              <p className="text-body text-tx-secondary">Build quote is prepared after scope approval.</p>
            ) : monthlyPrice ? (
              <p className="text-h3 text-tx-heading font-semibold">CA${monthlyPrice}/mo</p>
            ) : (
              <p className="text-body text-tx-secondary">Pricing was pending when this snapshot was created.</p>
            )}
          </div>

          {aiPriceRange && (
            <div className="mb-6 rounded-xl border border-border bg-white p-5">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">AI scope price insight</p>
              <p className="text-h4 text-tx-heading font-semibold">{aiPriceRange}</p>
              {snapshot.project.ai_price_confidence && (
                <p className="text-body-sm text-tx-muted capitalize mt-1">{snapshot.project.ai_price_confidence} confidence</p>
              )}
              {snapshot.project.ai_price_rationale && (
                <p className="text-body text-tx-secondary leading-relaxed mt-2">{snapshot.project.ai_price_rationale}</p>
              )}
            </div>
          )}

          {snapshot.project.description && (
            <div>
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-2">Project context</p>
              <p className="text-body text-tx-body leading-relaxed">{snapshot.project.description}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm mb-8">
          <h2 className="text-h3 text-tx-heading font-semibold mb-5">Timeline and milestones</h2>
          {snapshot.milestones.length === 0 ? (
            <p className="text-body text-tx-muted">No milestones were available in this snapshot.</p>
          ) : (
            <div className="space-y-4">
              {snapshot.milestones.map((milestone) => (
                <div key={milestone.id} className="rounded-xl border border-border bg-bg-subtle p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-body font-semibold text-tx-heading">{milestone.title || 'Milestone'}</p>
                      {milestone.description && <p className="mt-1 text-body-sm text-tx-secondary">{milestone.description}</p>}
                    </div>
                    <Badge variant="muted">{milestone.status || 'pending'}</Badge>
                  </div>
                  <p className="mt-3 text-body-sm text-tx-muted">Target date: {formatDate(milestone.due_date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-bg-subtle p-6 text-center">
          <h2 className="text-h4 text-tx-heading font-semibold">Clear next step</h2>
          <p className="mt-2 text-body text-tx-secondary">Ready to move this engagement forward? Request a direct owner walkthrough and formal contract handoff.</p>
          <div className="mt-5 flex justify-center gap-3 flex-wrap">
            <Button variant="primary" size="md" href="mailto:hello@unalabs.cloud?subject=Proceed%20with%20proposal%20review">
              Request contract handoff
            </Button>
            <Button variant="secondary" size="md" href="/start-project">
              Start your own engagement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
