'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { trackEvent } from '@/lib/analytics';

type Step = 1 | 2;

type RealtorFormData = {
  name: string;
  email: string;
  brokerage: string;
  role: string;
  leadVolume: string;
  painPoint: string;
  currentProcess: string;
  plan: string;
  billing: string;
};

const PLANS = [
  { id: 'starter', label: 'Starter', price: { monthly: 600, annual: 510 }, desc: 'Up to 50 leads/week', users: 'Single agent' },
  { id: 'professional', label: 'Professional', price: { monthly: 1200, annual: 1020 }, desc: 'Up to 200 leads/week', users: 'Team', recommended: true },
  { id: 'agency', label: 'Agency', price: { monthly: 2400, annual: 2040 }, desc: 'Up to 500 leads/week', users: 'Multiple teams' },
  { id: 'enterprise', label: 'Enterprise', price: { monthly: 4800, annual: 4080 }, desc: 'Unlimited leads', users: 'Full broker support' },
];

const LEAD_VOLUMES = ['<10/week', '10-50/week', '50-100/week', '100+/week'];

export function RealtorIntakeForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<RealtorFormData>({
    name: '',
    email: '',
    brokerage: '',
    role: '',
    leadVolume: '',
    painPoint: '',
    currentProcess: '',
    plan: 'professional',
    billing: 'monthly',
  });

  const set = (field: keyof RealtorFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const step1Valid = form.name.trim() && form.email.includes('@') && form.painPoint.trim();

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (step1Valid) {
      trackEvent('realtor_intake_step1_completed', {
        lead_volume: form.leadVolume || 'unspecified',
      });
      setStep(2);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const intakeId = `realtor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    trackEvent('realtor_plan_selected', {
      plan: form.plan,
      billing: form.billing,
    });
    sessionStorage.setItem('una_intake', JSON.stringify({ 
      ...form, 
      intakeId,
      type: 'realtor_lead',
    }));
    router.push('/start/summary');
  };

  const selectedPlan = PLANS.find(p => p.id === form.plan)!;
  const price = form.billing === 'annual'
    ? selectedPlan.price.annual
    : selectedPlan.price.monthly;

  return (
    <div className="min-h-screen bg-bg-offwhite">
      {/* Header */}
      <div className="bg-white border-b border-border py-6 px-6 text-center">
        <div className="max-w-tight mx-auto">
          <div className="flex justify-center mb-3">
            <Badge variant="teal">14 days free</Badge>
          </div>
          <h1 className="text-display-sm text-tx-heading mb-1">Start your realtor project</h1>
          <p className="text-body text-tx-secondary">Share your lead challenge, pick a plan, and move to activation.</p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-3">
                {s > 1 && <div className="w-12 h-px bg-border" />}
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-bold transition-colors',
                  step >= s ? 'bg-brand-teal text-white' : 'bg-bg-hover text-tx-muted',
                ].join(' ')}>
                  {s}
                </div>
                <span className={`text-body-sm font-medium ${step >= s ? 'text-tx-heading' : 'text-tx-muted'}`}>
                  {s === 1 ? 'Your details' : 'Choose plan'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-tight mx-auto px-6 py-10">
        {step === 1 ? (
          <form onSubmit={handleStep1} className="bg-white rounded-2xl border border-border p-8 flex flex-col gap-5 shadow-sm">
            <h2 className="text-h3 text-tx-heading">Tell us about your business</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Full name" id="name" value={form.name} onChange={set('name')} placeholder="Jane Smith" required />
              <Field label="Work email" id="email" type="email" value={form.email} onChange={set('email')} placeholder="jane@realbrokerage.com" required />
              <Field label="Brokerage" id="brokerage" value={form.brokerage} onChange={set('brokerage')} placeholder="Your Realty Group" />
              <Field label="Your role" id="role" value={form.role} onChange={set('role')} placeholder="Team Lead / Broker" />
            </div>

            {/* Lead volume */}
            <div>
              <label className="block text-body font-medium text-tx-heading mb-2">How many leads do you get per week?</label>
              <div className="flex flex-wrap gap-2">
                {LEAD_VOLUMES.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, leadVolume: v }))}
                    className={[
                      'px-4 py-2 rounded-lg border text-body-sm font-medium transition-colors',
                      form.leadVolume === v
                        ? 'bg-brand-teal text-white border-brand-teal'
                        : 'border-border text-tx-secondary hover:border-brand-teal hover:text-brand-teal',
                    ].join(' ')}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Pain point */}
            <div>
              <label htmlFor="painPoint" className="block text-body font-medium text-tx-heading mb-1">
                What is your biggest challenge with lead management?
                <span className="text-brand-orange ml-0.5">*</span>
              </label>
              <textarea
                id="painPoint"
                value={form.painPoint}
                onChange={set('painPoint')}
                placeholder="e.g., Too many unqualified leads, manual follow-up takes too long, hard to prioritize..."
                rows={3}
                required
                className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus transition-colors resize-none"
              />
            </div>

            {/* Current process (optional) */}
            <div>
              <label htmlFor="currentProcess" className="block text-body font-medium text-tx-heading mb-1">
                How do you currently handle incoming leads? (optional)
              </label>
              <textarea
                id="currentProcess"
                value={form.currentProcess}
                onChange={set('currentProcess')}
                placeholder="e.g., Manual spreadsheet, CRM, phone screening..."
                rows={2}
                className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!step1Valid}
              className="w-full px-8 py-4 bg-brand-orange text-white font-semibold rounded-lg hover:bg-brand-orange-hover active:scale-[0.98] transition-all shadow-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to plan selection →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Billing toggle */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-border p-5 shadow-sm">
              <span className="text-body font-semibold text-tx-heading">Billing cycle</span>
              <div className="inline-flex items-center rounded-lg border border-border p-1 gap-1">
                {(['monthly', 'annual'] as const).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, billing: b }))}
                    className={[
                      'px-4 py-1.5 rounded-md text-body-sm font-medium transition-colors flex items-center gap-2',
                      form.billing === b ? 'bg-brand-teal text-white' : 'text-tx-secondary hover:text-tx-heading',
                    ].join(' ')}
                  >
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                    {b === 'annual' && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-orange text-white">
                        Save 15%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map(plan => {
                const p = form.billing === 'annual' ? plan.price.annual : plan.price.monthly;
                const selected = form.plan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, plan: plan.id }))}
                    className={[
                      'relative text-left p-5 rounded-xl border-2 transition-all h-full flex flex-col',
                      selected ? 'border-brand-teal bg-brand-teal/5 shadow-teal' : 'border-border bg-white hover:border-brand-teal/50',
                    ].join(' ')}
                  >
                    {plan.recommended && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-brand-orange text-white">
                        Popular
                      </span>
                    )}
                    <p className="text-body font-bold text-tx-heading mb-0.5">{plan.label}</p>
                    <p className="text-body-sm text-tx-muted mb-3 min-h-[40px]">{plan.desc}</p>
                    <div className="mt-auto flex items-baseline gap-0.5 mb-1">
                      <span className="text-[10px] font-bold text-tx-muted uppercase tracking-wide">CA</span>
                      <span className="text-2xl font-bold text-tx-heading">${p}</span>
                      <span className="text-body-sm text-tx-muted">/mo</span>
                    </div>
                    <p className="text-[10px] text-tx-muted">{plan.users}</p>
                  </button>
                );
              })}
            </div>

            {/* Summary + CTA */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-body-sm text-tx-muted mb-0.5">Selected plan</p>
                <p className="text-body font-bold text-tx-heading">{selectedPlan.label} — CA${price}/mo</p>
                <p className="text-body-sm text-tx-secondary">
                  {form.billing === 'annual' ? 'Billed annually (CA$' + (price * 12).toLocaleString('en-CA') + '/yr)' : 'Billed monthly'} · 14-day free trial
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button type="button" onClick={() => setStep(1)} className="px-5 py-3 rounded-lg border border-border text-body font-medium text-tx-secondary hover:text-tx-heading transition-colors">
                  ← Back
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-brand-orange text-white font-semibold rounded-lg hover:bg-brand-orange-hover active:scale-[0.98] transition-all shadow-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                >
                  Review & continue →
                </button>
              </div>
            </div>

            <p className="text-center text-caption text-tx-muted">
              Activation opens your workspace. Card is required at checkout and billed after trial terms.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label, id, type = 'text', value, onChange, placeholder, required,
}: {
  label: string; id: string; type?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-body font-medium text-tx-heading mb-1">
        {label}{required && <span className="text-brand-orange ml-0.5">*</span>}
      </label>
      <input
        id={id} type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus transition-colors"
      />
    </div>
  );
}
