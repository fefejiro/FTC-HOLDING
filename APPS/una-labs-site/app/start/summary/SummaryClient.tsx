'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { STRIPE_API_URL } from '@/lib/stripe-config';

type Intake = {
  intakeId: string;
  name: string;
  email: string;
  company: string;
  role: string;
  teamSize: string;
  plan: string;
  billing: string;
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  agency: 'Agency',
  enterprise: 'Enterprise',
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 67, annual: 57 },
  professional: { monthly: 135, annual: 108 },
  agency: { monthly: 339, annual: 271 },
  enterprise: { monthly: 679, annual: 543 },
};

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['1 user', 'Up to 3 active projects', 'Intake forms', 'Basic proposals', 'Email support'],
  professional: ['5 users', 'Unlimited projects', 'Full proposal suite', 'Payment collection', 'Dashboard & reporting', 'Priority support'],
  agency: ['20 users', 'Unlimited projects', 'Client portal', 'White-label reports', 'Workflow automation', 'Dedicated support'],
  enterprise: ['Unlimited users', 'Custom integrations', 'SLA guarantee', 'Custom contracts', 'Onboarding support', 'Account manager'],
};

export function SummaryClient() {
  const router = useRouter();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('una_intake');
    if (!raw) { router.replace('/start'); return; }
    try { setIntake(JSON.parse(raw)); }
    catch { router.replace('/start'); }
  }, [router]);

  const handleCheckout = async () => {
    if (!intake) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${STRIPE_API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: intake.email,
          tier: intake.plan,
          billing: intake.billing,
          intake_id: intake.intakeId,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create checkout session.');
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (!intake) {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted">Loading your summary…</p>
      </div>
    );
  }

  const prices = PLAN_PRICES[intake.plan] ?? PLAN_PRICES.professional;
  const monthlyPrice = intake.billing === 'annual' ? prices.annual : prices.monthly;
  const annualTotal = monthlyPrice * 12;
  const features = PLAN_FEATURES[intake.plan] ?? [];

  return (
    <div className="min-h-screen bg-bg-offwhite">
      <div className="bg-white border-b border-border py-6 px-6 text-center">
        <div className="max-w-content mx-auto">
          <div className="flex justify-center mb-2">
            <Badge variant="teal">Review your plan</Badge>
          </div>
          <h1 className="text-display-sm text-tx-heading">Almost there, {intake.name.split(' ')[0]}</h1>
          <p className="text-body text-tx-secondary mt-1">14-day free trial — card required, charged only after trial ends.</p>
        </div>
      </div>

      <div className="max-w-content mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left: details */}
        <div className="flex flex-col gap-6">
          {/* Account details */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 text-tx-heading">Account details</h2>
              <button onClick={() => router.push('/start')} className="text-body-sm text-brand-teal hover:underline font-medium">
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-body-sm">
              <DetailRow label="Name" value={intake.name} />
              <DetailRow label="Email" value={intake.email} />
              <DetailRow label="Company" value={intake.company} />
              {intake.role && <DetailRow label="Role" value={intake.role} />}
              {intake.teamSize && <DetailRow label="Team size" value={intake.teamSize} />}
            </dl>
          </div>

          {/* Plan details */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 text-tx-heading">Plan details</h2>
              <button onClick={() => router.push('/start')} className="text-body-sm text-brand-teal hover:underline font-medium">
                Change
              </button>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-[11px] font-bold text-tx-muted uppercase tracking-wide">CA</span>
              <span className="text-4xl font-bold text-tx-heading">${monthlyPrice}</span>
              <span className="text-body-sm text-tx-secondary">/mo</span>
              {intake.billing === 'annual' && (
                <span className="ml-2 text-body-sm text-tx-muted">(CA${annualTotal.toLocaleString('en-CA')}/yr)</span>
              )}
            </div>
            <p className="text-body-sm text-tx-muted mb-4">
              {PLAN_LABELS[intake.plan]} · billed {intake.billing}
            </p>
            <ul className="flex flex-col gap-2">
              {features.map(f => (
                <li key={f} className="flex items-center gap-2 text-body-sm text-tx-body">
                  <span className="text-brand-teal font-bold flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* What happens next */}
          <div className="bg-bg-offwhite rounded-2xl border border-border p-6">
            <h2 className="text-h3 text-tx-heading mb-4">What happens after checkout?</h2>
            <ol className="flex flex-col gap-3">
              {[
                ['Trial starts immediately', '14 days full access to all ' + PLAN_LABELS[intake.plan] + ' features.'],
                ['Card charged on day 15', 'CA$' + monthlyPrice + '/mo — cancel any time before then with no charge.'],
                ['Invite your team', 'Add teammates, set up your first project, and configure your intake forms.'],
                ['Dedicated onboarding', 'We send a setup guide and support link within 24 hours.'],
              ].map(([title, desc], i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-teal text-white text-[11px] font-bold flex-shrink-0 flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-body-sm font-semibold text-tx-heading">{title}</p>
                    <p className="text-body-sm text-tx-secondary">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: payment CTA */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="bg-white rounded-2xl border-2 border-brand-teal shadow-teal shadow-md p-6">
            <p className="text-body-sm text-tx-muted mb-1">You're starting</p>
            <h3 className="text-h2 text-tx-heading mb-1">{PLAN_LABELS[intake.plan]}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-[11px] font-bold text-tx-muted uppercase tracking-wide">CA</span>
              <span className="text-3xl font-bold text-tx-heading">${monthlyPrice}</span>
              <span className="text-body-sm text-tx-secondary">/mo</span>
            </div>

            <div className="flex flex-col gap-2 text-body-sm text-tx-secondary mb-6 p-4 bg-bg-offwhite rounded-xl">
              <div className="flex justify-between">
                <span>Trial period</span>
                <span className="font-semibold text-brand-teal">14 days free</span>
              </div>
              <div className="flex justify-between">
                <span>Billing starts</span>
                <span className="font-medium text-tx-heading">Day 15</span>
              </div>
              <div className="flex justify-between">
                <span>Billing cycle</span>
                <span className="font-medium text-tx-heading capitalize">{intake.billing}</span>
              </div>
              <div className="flex justify-between">
                <span>Due today</span>
                <span className="font-bold text-tx-heading">CA$0</span>
              </div>
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
              {loading ? 'Redirecting to Stripe…' : 'Start free trial →'}
            </button>

            <p className="text-center text-[11px] text-tx-muted mt-4">
              Secured by Stripe · No card charged today
            </p>

            <div className="flex items-center justify-center gap-4 mt-4 opacity-60">
              <StripeIcon />
            </div>
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

function StripeIcon() {
  return (
    <svg width="47" height="20" viewBox="0 0 47 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Stripe">
      <path d="M22.4 7.2c0-1.1.9-1.6 2.4-1.6 2.1 0 4.8.7 6.9 1.8V2.5C29.4.9 26.9.2 24.4.2c-5 0-8.4 2.6-8.4 6.9 0 6.8 9.3 5.7 9.3 8.6 0 1.3-1.1 1.7-2.7 1.7-2.3 0-5.3-.9-7.6-2.3v5c2.6 1.1 5.2 1.6 7.6 1.6 5.1 0 8.7-2.5 8.7-6.9-.1-7.2-9.3-6-9.3-8.6z" fill="#6772e5"/>
      <path d="M0 19.4h5.4V.6H0v18.8z" fill="#6772e5"/>
      <path d="M37.6.6l-5.2 18.8h5.2l.9-3.4h5.4l.9 3.4H50L44.8.6h-7.2zm1.7 11.5l1.9-7.2 1.9 7.2h-3.8z" fill="#6772e5"/>
    </svg>
  );
}
