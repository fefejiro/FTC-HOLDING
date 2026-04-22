'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { STRIPE_API_URL } from '@/lib/stripe-config';
import { ACTIVATION_BAND_BY_ID, type ActivationBandId } from '@/lib/service-engagement';

type ProjectActivation = {
  intakeId: string;
  name: string;
  email: string;
  company: string;
  role: string;
  projectTitle: string;
  projectSummary: string;
  activationBand: ActivationBandId;
  activationFee: number;
  checkoutType: 'activation';
  serviceType: 'custom_project_activation';
  founderOverride?: boolean;
  creditTowardBuild?: boolean;
};

export function ProjectActivationSummaryClient() {
  const router = useRouter();
  const [activation, setActivation] = useState<ProjectActivation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('una_project_activation');
    if (!raw) {
      router.replace('/start-project');
      return;
    }

    try {
      setActivation(JSON.parse(raw));
    } catch {
      router.replace('/start-project');
    }
  }, [router]);

  const handleCheckout = async () => {
    if (!activation) return;

    setLoading(true);
    setError('');

    try {
      await fetch(`${STRIPE_API_URL}/api/intake-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activation.email,
          name: activation.name,
          tier: activation.activationBand,
          billing: 'one_time',
          checkout_type: 'activation',
          amount_cad: activation.activationFee,
          credit_toward_build: Boolean(activation.creditTowardBuild),
        }),
      }).catch(() => {
        // Best-effort only.
      });

      const response = await fetch(`${STRIPE_API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activation.email,
          tier: activation.activationBand,
          billing: 'one_time',
          intake_id: activation.intakeId,
          checkout_type: 'activation',
          service_type: activation.serviceType,
          founder_override: Boolean(activation.founderOverride),
          credit_toward_build: Boolean(activation.creditTowardBuild),
          amount_cad: activation.activationFee,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Failed to create checkout session.');
      }

      window.location.href = body.url;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (!activation) {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted">Loading your activation summary...</p>
      </div>
    );
  }

  const selectedBand = ACTIVATION_BAND_BY_ID[activation.activationBand];

  return (
    <div className="min-h-screen bg-bg-offwhite">
      <div className="bg-white border-b border-border py-6 px-6 text-center">
        <div className="max-w-content mx-auto">
          <div className="flex justify-center mb-2">
            <Badge variant="teal">Review activation</Badge>
          </div>
          <h1 className="text-display-sm text-tx-heading">Project activation review</h1>
          <p className="text-body text-tx-secondary mt-1">
            This payment opens the workspace and funds the scope pack. Build deposit comes later, after approval.
          </p>
        </div>
      </div>

      <div className="max-w-content mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 text-tx-heading">Project overview</h2>
              <button onClick={() => router.push('/start-project')} className="text-body-sm text-brand-teal hover:underline font-medium">
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-body-sm">
              <DetailRow label="Name" value={activation.name} />
              <DetailRow label="Email" value={activation.email} />
              <DetailRow label="Company" value={activation.company} />
              {activation.role && <DetailRow label="Role" value={activation.role} />}
              <DetailRow label="Project title" value={activation.projectTitle} />
            </dl>
            <div className="mt-5">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-2">Summary</p>
              <p className="text-body text-tx-body leading-relaxed">{activation.projectSummary}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-h3 text-tx-heading mb-4">What activation includes</h2>
            <ol className="flex flex-col gap-3">
              {[
                ['Intake capture', 'Your project context is recorded and turned into a structured workspace.'],
                ['Scope pack', 'You receive the problem framing, solution direction, roadmap, and initial pricing recommendation.'],
                ['Approval-ready next step', 'Once the scope is approved, build deposit and active execution can begin.'],
              ].map(([title, description], index) => (
                <li key={index} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-teal text-white text-[11px] font-bold flex-shrink-0 flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-body-sm font-semibold text-tx-heading">{title}</p>
                    <p className="text-body-sm text-tx-secondary">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 self-start">
          <div className="bg-white rounded-2xl border-2 border-brand-teal shadow-teal shadow-md p-6">
            <p className="text-body-sm text-tx-muted mb-1">You&apos;re activating</p>
            <h3 className="text-h2 text-tx-heading mb-1">{selectedBand.label}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-[11px] font-bold text-tx-muted uppercase tracking-wide">CA</span>
              <span className="text-3xl font-bold text-tx-heading">${selectedBand.price}</span>
            </div>

            <div className="flex flex-col gap-2 text-body-sm text-tx-secondary mb-6 p-4 bg-bg-offwhite rounded-xl">
              <div className="flex justify-between">
                <span>Service type</span>
                <span className="font-medium text-tx-heading">Custom project activation</span>
              </div>
              <div className="flex justify-between">
                <span>Charged today</span>
                <span className="font-bold text-tx-heading">CA${selectedBand.price}</span>
              </div>
              <div className="flex justify-between">
                <span>Build deposit</span>
                <span className="font-medium text-tx-heading">Requested after scope approval</span>
              </div>
              {selectedBand.creditTowardBuild && (
                <div className="flex justify-between">
                  <span>Credit toward build</span>
                  <span className="font-medium text-brand-teal">Yes</span>
                </div>
              )}
            </div>

            {error && (
              <p className="text-body-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
                {error}
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full px-8 py-4 bg-brand-orange text-white font-semibold rounded-lg hover:bg-brand-orange-hover active:scale-[0.98] transition-all shadow-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed text-body"
            >
              {loading ? 'Redirecting to Stripe...' : 'Pay activation fee'}
            </button>

            <p className="text-center text-[11px] text-tx-muted mt-4">
              Secured by Stripe | Scope and build remain separate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-tx-muted">{label}</dt>
      <dd className="font-medium text-tx-heading">{value}</dd>
    </div>
  );
}
