'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { trackEvent } from '@/lib/analytics';
import { getAteamEndpoint } from '@/lib/projects';

type Step = 1 | 2;

type FormData = {
  name: string;
  email: string;
  company: string;
  role: string;
  teamSize: string;
  domain: string;
  description: string;
  budgetRange: string;
  timeline: string;
  plan: string;
  billing: string;
};

type ProjectClassification = {
  tier?: string;
  reason?: string;
  suggested_price?: string;
};

const PLANS = [
  { id: 'starter', label: 'Starter', price: { monthly: 67, annual: 57 }, desc: 'Solo practitioners', users: '1 user' },
  { id: 'professional', label: 'Professional', price: { monthly: 135, annual: 108 }, desc: 'Growing teams', users: '5 users', recommended: true },
  { id: 'agency', label: 'Agency', price: { monthly: 339, annual: 271 }, desc: 'Agencies & studios', users: '20 users' },
  { id: 'enterprise', label: 'Enterprise', price: { monthly: 679, annual: 543 }, desc: 'Large organisations', users: 'Unlimited' },
];

const TEAM_SIZES = ['Just me', '2–5', '6–15', '16–50', '50+'];
const BUDGET_RANGES = ['Under CA$2k', 'CA$2k–5k', 'CA$5k–15k', 'CA$15k+'];
const TIMELINES = ['ASAP', '2–4 weeks', '1–2 months', 'Flexible'];

function normalizeTrackingValue(raw: string | null): string {
  if (!raw) return '';
  return raw.trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 80);
}

function prettyProductName(product: string): string {
  switch (product) {
    case 'dispatch':
      return 'Dispatch';
    case 'peacepad':
      return 'PeacePad';
    case 'saywetin':
      return 'SayWetin';
    default:
      return product;
  }
}

export function IntakeForm() {
  const router = useRouter();
  const [source, setSource] = useState('');
  const [product, setProduct] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState<FormData>({
    name: '', email: '', company: '', role: '',
    teamSize: '', domain: '', description: '', budgetRange: '', timeline: '', plan: 'professional', billing: 'monthly',
  });

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const step1Valid = form.name.trim() && form.email.includes('@') && form.description.trim();

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (step1Valid) {
      trackEvent('intake_step1_completed', {
        source: source || 'start_page',
        product: product || 'none',
      });
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const intakeId = `intake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tracking = {
      source: source || 'start_page',
      ...(product ? { product } : {}),
      ...(source ? { campaign: source } : {}),
    };
    trackEvent('intake_plan_selected', {
      plan: form.plan,
      billing: form.billing,
      source: source || 'start_page',
    });
    const intakePayload = { ...form, intakeId, ...tracking };

    try {
      const { createBrowserClient } = await import('@ftc/supabase');
      const supabase = createBrowserClient();

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          client_name: form.name.trim(),
          client_email: form.email.trim(),
          domain: form.domain.trim() || null,
          description: form.description.trim(),
          budget_range: form.budgetRange || `${form.plan}:${form.billing}`,
          timeline: form.timeline || null,
          tier: 'unknown',
          status: 'scoping',
          notes: [
            form.company ? `Company: ${form.company}` : '',
            form.role ? `Role: ${form.role}` : '',
            form.teamSize ? `Team size: ${form.teamSize}` : '',
            `Plan preference: ${form.plan} (${form.billing})`,
            source ? `Source: ${source}` : '',
            product ? `Product source: ${product}` : '',
          ].filter(Boolean).join('\n')
        })
        .select('id')
        .single();

      if (error || !project?.id) {
        throw error || new Error('Project record could not be created.');
      }

      let classification: ProjectClassification | null = null;
      const classifyEndpoint = getAteamEndpoint('/api/ateam/classify-project');
      if (classifyEndpoint) {
        try {
          const classifyResponse = await fetch(classifyEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: project.id,
              description: form.description,
              budget_range: form.budgetRange || `${form.plan}:${form.billing}`,
              timeline: form.timeline,
            }),
          });
          const classifyBody = await classifyResponse.json().catch(() => null) as { classification?: ProjectClassification } | null;
          if (classifyResponse.ok && classifyBody?.classification) {
            classification = classifyBody.classification;
          }
        } catch {
          // Classification is best-effort at this step.
        }
      }

      sessionStorage.setItem(
        'una_intake',
        JSON.stringify({
          ...intakePayload,
          projectId: project.id,
          classification,
        }),
      );
      router.push('/start/summary');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to start your project right now.');
      setSubmitting(false);
    }
  };

  const selectedPlan = PLANS.find(p => p.id === form.plan)!;
  const price = form.billing === 'annual'
    ? selectedPlan.price.annual
    : selectedPlan.price.monthly;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSource(normalizeTrackingValue(params.get('source')));
    setProduct(normalizeTrackingValue(params.get('product')));
  }, []);

  return (
    <div className="min-h-screen bg-bg-offwhite">
      {/* Header */}
      <div className="bg-white border-b border-border py-6 px-6 text-center">
        <div className="max-w-tight mx-auto">
          <div className="flex justify-center mb-3">
            <Badge variant="teal">14 days free</Badge>
          </div>
          <h1 className="text-display-sm text-tx-heading mb-1">Start your project</h1>
          <p className="text-body text-tx-secondary">Structured intake in under two minutes.</p>

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
        {source && product && (
          <div className="mb-5 rounded-xl border border-brand-teal/30 bg-brand-teal/10 px-4 py-3">
            <p className="text-body-sm text-tx-heading">
              Starting from <span className="font-semibold">{prettyProductName(product)}</span> case study.
            </p>
          </div>
        )}
        {step === 1 ? (
          <form onSubmit={handleStep1} className="bg-white rounded-2xl border border-border p-8 flex flex-col gap-5 shadow-sm">
            <h2 className="text-h3 text-tx-heading">Tell us about yourself</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Full name" id="name" value={form.name} onChange={set('name')} placeholder="Jane Smith" required />
              <Field label="Work email" id="email" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
              <Field label="Company / firm name" id="company" value={form.company} onChange={set('company')} placeholder="Acme Consulting" />
              <Field label="Your role" id="role" value={form.role} onChange={set('role')} placeholder="Managing Director" />
              <Field label="Client domain" id="domain" value={form.domain} onChange={set('domain')} placeholder="clientdomain.ca" />
              <Field label="Timeline" id="timeline" value={form.timeline} onChange={set('timeline')} placeholder="2-4 weeks" />
            </div>

            <TextAreaField
              label="What do you need built?"
              id="description"
              value={form.description}
              onChange={(e) => setForm((previous) => ({ ...previous, description: e.target.value }))}
              placeholder="Describe the site, workflow, or platform you need."
              required
            />

            <div>
              <label className="block text-body font-medium text-tx-heading mb-1">Budget range</label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_RANGES.map((budget) => (
                  <button
                    key={budget}
                    type="button"
                    onClick={() => setForm((previous) => ({ ...previous, budgetRange: budget }))}
                    className={[
                      'px-4 py-2 rounded-lg border text-body-sm font-medium transition-colors',
                      form.budgetRange === budget
                        ? 'bg-brand-teal text-white border-brand-teal'
                        : 'border-border text-tx-secondary hover:border-brand-teal hover:text-brand-teal',
                    ].join(' ')}
                  >
                    {budget}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-body font-medium text-tx-heading mb-1">Team size</label>
              <div className="flex flex-wrap gap-2">
                {TEAM_SIZES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, teamSize: s }))}
                    className={[
                      'px-4 py-2 rounded-lg border text-body-sm font-medium transition-colors',
                      form.teamSize === s
                        ? 'bg-brand-teal text-white border-brand-teal'
                        : 'border-border text-tx-secondary hover:border-brand-teal hover:text-brand-teal',
                    ].join(' ')}
                  >
                    {s}
                  </button>
                ))}
              </div>
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
                        Save 20%
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
                {(form.budgetRange || form.timeline) && (
                  <p className="text-body-sm text-tx-muted mt-1">
                    {[form.budgetRange, form.timeline].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button type="button" onClick={() => setStep(1)} className="px-5 py-3 rounded-lg border border-border text-body font-medium text-tx-secondary hover:text-tx-heading transition-colors">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-brand-orange text-white font-semibold rounded-lg hover:bg-brand-orange-hover active:scale-[0.98] transition-all shadow-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                >
                  {submitting ? 'Saving project…' : 'Review & continue →'}
                </button>
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-600">
                {submitError}
              </div>
            )}

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

function TextAreaField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-body font-medium text-tx-heading mb-1">
        {label}{required && <span className="text-brand-orange ml-0.5">*</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={5}
        className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus transition-colors resize-y"
      />
    </div>
  );
}
