'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { getCommercialLabel } from '@/lib/service-engagement';

type ProjectRecord = {
  id: string;
  email: string;
  name?: string;
  tier?: string;
  billing?: string;
  status?: string;
  created_at?: string;
};

type MilestoneRecord = {
  id: string;
  title?: string;
  due_date?: string;
  status?: string;
};

type ContractRecord = {
  id: string;
  project_id: string;
  title?: string;
  body: string;
  status?: string;
  sent_at?: string;
  signer_name?: string;
  signer_email?: string;
  signed_at?: string;
};

type ContractState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; project: ProjectRecord; milestones: MilestoneRecord[]; contract: ContractRecord };

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

export function ContractClient({ initialProjectId }: { initialProjectId?: string }) {
  const [state, setState] = useState<ContractState>({ phase: 'loading' });
  const [signerName, setSignerName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const searchParams = useSearchParams();
  const id = initialProjectId || searchParams.get('id');

  useEffect(() => {
    if (!id) {
      setState({ phase: 'error', message: 'No project ID provided.' });
      return;
    }

    async function loadContract() {
      try {
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: `/login?redirect=/dashboard/contract?id=${id}` });
          return;
        }

        const response = await fetch(getStripeApiUrl('/api/contracts/ensure'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ project_id: id }),
        });

        const payload = await response.json() as {
          error?: string;
          project: ProjectRecord;
          milestones: MilestoneRecord[];
          contract: ContractRecord;
        };

        if (!response.ok) {
          setState({ phase: 'error', message: payload.error ?? 'Unable to load contract.' });
          return;
        }

        setSignerName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '');
        setState({
          phase: 'ready',
          email: session.user.email ?? '',
          project: payload.project,
          milestones: payload.milestones ?? [],
          contract: payload.contract,
        });
      } catch (error) {
        setState({ phase: 'error', message: error instanceof Error ? error.message : 'Unable to load contract.' });
      }
    }

    void loadContract();
  }, [id]);

  async function handleSign() {
    if (state.phase !== 'ready') return;
    if (!signerName.trim()) {
      setActionState('error');
      return;
    }
    if (!accepted) {
      setActionState('error');
      return;
    }

    setActionState('loading');
    try {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();
      if (!session?.user) {
        setState({ phase: 'unauthenticated', redirectUrl: `/login?redirect=/dashboard/contract?id=${state.project.id}` });
        return;
      }

      const response = await fetch(getStripeApiUrl('/api/contracts/sign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          project_id: state.project.id,
          signer_name: signerName.trim(),
          accepted: true,
        }),
      });

      const payload = await response.json() as { error?: string; contract?: ContractRecord; project?: ProjectRecord };
      if (!response.ok || !payload.contract) {
        setActionState('error');
        return;
      }

      setState({
        ...state,
        contract: payload.contract,
      });
      setActionState('done');
    } catch {
      setActionState('error');
    }
  }

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading contract...</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Authentication required</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Sign in to review your engagement letter</h1>
          <p className="mt-4 text-body text-tx-secondary">This contract is only visible to the project owner.</p>
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
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Error loading contract</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Unable to load engagement letter</h1>
          <p className="mt-4 text-body text-tx-secondary">{state.message}</p>
        </div>
      </div>
    );
  }

  const planLabel = getCommercialLabel(state.project.tier);
  const isSigned = state.contract.status === 'signed';

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-12">
          <div>
            <Badge variant={isSigned ? 'teal' : 'orange'}>{isSigned ? 'Signed' : 'Ready to sign'}</Badge>
            <h1 className="mt-4 text-display-sm text-tx-heading font-semibold">{state.contract.title || 'Engagement Letter'}</h1>
            <p className="mt-2 text-body text-tx-secondary">
              {state.project.name || `Project ${state.project.id.slice(0, 8)}`} · {planLabel}
            </p>
          </div>
          <div className="flex gap-3 no-print">
            <Button variant="secondary" size="sm" href={`/dashboard/proposal?id=${state.project.id}`}>
              Back to proposal
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[28px] border border-border bg-white shadow-sm p-8">
            <div className="grid gap-4 md:grid-cols-3 mb-8 pb-8 border-b border-border">
              <div>
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Client</p>
                <p className="text-body text-tx-heading">{state.email}</p>
              </div>
              <div>
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Plan</p>
                <p className="text-body text-tx-heading">{planLabel}</p>
              </div>
              <div>
                <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Prepared</p>
                <p className="text-body text-tx-heading">{formatDate(state.contract.sent_at || state.project.created_at)}</p>
              </div>
            </div>

            <div className="prose prose-neutral max-w-none whitespace-pre-line text-tx-body leading-8">
              {state.contract.body}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-border bg-bg-subtle p-6">
              <h2 className="text-h3 text-tx-heading font-semibold">Contract status</h2>
              {isSigned ? (
                <div className="mt-4 space-y-3">
                  <Badge variant="teal">Signed</Badge>
                  <p className="text-body text-tx-body">Signed by {state.contract.signer_name || state.contract.signer_email || state.email}</p>
                  <p className="text-body-sm text-tx-muted">Signed on {formatDate(state.contract.signed_at)}</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <Badge variant="orange">Pending signature</Badge>
                  <p className="text-body text-tx-body">Review the engagement terms, then sign below to confirm the scope and working terms.</p>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
              <h2 className="text-h3 text-tx-heading font-semibold">Current scope</h2>
              <div className="mt-4 space-y-3">
                {state.milestones.length > 0 ? state.milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-xl border border-border bg-bg-offwhite px-4 py-3">
                    <p className="text-body font-semibold text-tx-heading">{milestone.title || 'Milestone'}</p>
                    <p className="text-body-sm text-tx-muted mt-1">
                      {milestone.due_date ? `Target ${formatDate(milestone.due_date)}` : 'Due date will be confirmed in delivery.'}
                    </p>
                  </div>
                )) : (
                  <p className="text-body text-tx-secondary">Scope milestones will continue to live in your dashboard and portal.</p>
                )}
              </div>
            </div>

            {!isSigned && (
              <div className="rounded-[28px] border border-border bg-white p-6 shadow-sm no-print">
                <h2 className="text-h3 text-tx-heading font-semibold">Sign engagement letter</h2>
                <label className="block mt-4">
                  <span className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Full legal name</span>
                  <input
                    value={signerName}
                    onChange={(event) => setSignerName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border px-4 py-3 text-body text-tx-heading focus:outline-none focus:border-border-focus"
                    placeholder="Your full name"
                  />
                </label>
                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-body-sm text-tx-body">I confirm that I have authority to sign for this engagement and I accept the scope and terms in this letter.</span>
                </label>
                <div className="mt-5 flex items-center gap-3">
                  <Button variant="primary" size="md" onClick={handleSign} disabled={actionState === 'loading'}>
                    {actionState === 'loading' ? 'Signing...' : 'Sign contract'}
                  </Button>
                  {actionState === 'done' && <span className="text-body-sm font-semibold text-brand-teal">Signed successfully.</span>}
                  {actionState === 'error' && <span className="text-body-sm font-semibold text-red-500">Check your name and acceptance box, then try again.</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
