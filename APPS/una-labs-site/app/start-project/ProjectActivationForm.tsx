'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import {
  ACTIVATION_BANDS,
  type ActivationBandId,
  CUSTOM_PROJECT_SERVICE_TYPE,
} from '@/lib/service-engagement';

type Step = 1 | 2;

type ProjectActivationFormData = {
  name: string;
  email: string;
  company: string;
  role: string;
  projectTitle: string;
  projectSummary: string;
  activationBand: ActivationBandId;
};

function normalizeTrackingValue(raw: string | null): string {
  if (!raw) return '';
  return raw.trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 80);
}

export function ProjectActivationForm() {
  const router = useRouter();
  const [source, setSource] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ProjectActivationFormData>({
    name: '',
    email: '',
    company: '',
    role: '',
    projectTitle: '',
    projectSummary: '',
    activationBand: 'standard_activation',
  });

  const set =
    (field: keyof ProjectActivationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: e.target.value }));

  const step1Valid =
    form.name.trim() &&
    form.email.includes('@') &&
    form.company.trim() &&
    form.projectTitle.trim() &&
    form.projectSummary.trim();

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (step1Valid) {
      setStep(2);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const intakeId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const selectedBand = ACTIVATION_BANDS.find((band) => band.id === form.activationBand)!;
    const tracking = {
      source: source || 'start_project',
    };

    sessionStorage.setItem(
      'una_project_activation',
      JSON.stringify({
        ...form,
        intakeId,
        ...tracking,
        checkoutType: 'activation',
        serviceType: CUSTOM_PROJECT_SERVICE_TYPE.id,
        founderOverride: Boolean(selectedBand.founderOverride),
        creditTowardBuild: Boolean(selectedBand.creditTowardBuild),
        activationFee: selectedBand.price,
      }),
    );

    router.push('/start-project/summary');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSource(normalizeTrackingValue(params.get('source')));
  }, []);

  const selectedBand = ACTIVATION_BANDS.find((band) => band.id === form.activationBand)!;

  return (
    <div className="min-h-screen bg-bg-offwhite">
      <div className="border-b border-border bg-white px-6 py-6 text-center">
        <div className="mx-auto max-w-tight">
          <div className="mb-3 flex justify-center">
            <Badge variant="teal">Concierge onboarding</Badge>
          </div>
          <h1 className="mb-1 text-display-sm text-tx-heading">Start your project</h1>
          <p className="text-body text-tx-secondary">
            Activation opens the workspace, structures the brief, and sets up the scoped plan before build starts.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            {[1, 2].map((currentStep) => (
              <div key={currentStep} className="flex items-center gap-3">
                {currentStep > 1 && <div className="h-px w-12 bg-border" />}
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-body-sm font-bold transition-colors',
                    step >= currentStep ? 'bg-brand-teal text-white' : 'bg-bg-hover text-tx-muted',
                  ].join(' ')}
                >
                  {currentStep}
                </div>
                <span
                  className={`text-body-sm font-medium ${step >= currentStep ? 'text-tx-heading' : 'text-tx-muted'}`}
                >
                  {currentStep === 1 ? 'Project details' : 'Activation fee'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-tight px-6 py-10">
        {source && (
          <div className="mb-5 rounded-xl border border-brand-teal/30 bg-brand-teal/10 px-4 py-3">
            <p className="text-body-sm text-tx-heading">
              Started from <span className="font-semibold">{source}</span>.
            </p>
          </div>
        )}

        {step === 1 ? (
          <form
            onSubmit={handleStep1}
            className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-8 shadow-sm"
          >
            <h2 className="text-h3 text-tx-heading">Tell us about the project</h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Full name" id="name" value={form.name} onChange={set('name')} placeholder="Jane Smith" required />
              <Field label="Work email" id="email" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
              <Field label="Company / firm name" id="company" value={form.company} onChange={set('company')} placeholder="Acme Consulting" required />
              <Field label="Your role" id="role" value={form.role} onChange={set('role')} placeholder="Managing Director" />
            </div>

            <Field
              label="Project title"
              id="project-title"
              value={form.projectTitle}
              onChange={set('projectTitle')}
              placeholder="Client portal and approval flow"
              required
            />

            <div>
              <label htmlFor="project-summary" className="mb-1 block text-body font-medium text-tx-heading">
                Project summary <span className="ml-0.5 text-brand-orange">*</span>
              </label>
              <textarea
                id="project-summary"
                rows={6}
                value={form.projectSummary}
                onChange={set('projectSummary')}
                placeholder="Describe the idea the way you would explain it on a call. Rough is fine."
                required
                className="w-full rounded-lg border border-border px-4 py-3 text-body focus:border-border-focus focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!step1Valid}
              className="w-full rounded-lg bg-brand-orange px-8 py-4 font-semibold text-white transition-all shadow-orange hover:bg-brand-orange-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue to activation →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4">
              {ACTIVATION_BANDS.map((band) => {
                const selected = band.id === form.activationBand;
                return (
                  <button
                    key={band.id}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, activationBand: band.id }))}
                    className={[
                      'rounded-2xl border-2 bg-white p-5 text-left transition-all',
                      selected ? 'border-brand-teal bg-brand-teal/5 shadow-md shadow-teal' : 'border-border hover:border-brand-teal/50',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-body font-bold text-tx-heading">{band.label}</p>
                        <p className="mt-1 text-body-sm text-tx-muted">{band.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-tx-muted">CA</p>
                        <p className="text-3xl font-bold text-tx-heading">${band.price}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-body-sm text-tx-secondary">{band.note}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-body-sm text-tx-muted mb-0.5">Selected activation</p>
                <p className="text-body font-bold text-tx-heading">
                  {selectedBand.label} — CA${selectedBand.price}
                </p>
                <p className="text-body-sm text-tx-secondary mt-1">
                  Covers intake capture, structured brief, solution direction, roadmap, and first pricing recommendation.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-border px-5 py-3 text-body font-medium text-tx-secondary transition-colors hover:text-tx-heading"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-orange px-8 py-3 font-semibold text-white transition-all shadow-orange hover:bg-brand-orange-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                >
                  Review activation →
                </button>
              </div>
            </div>

            <p className="text-center text-caption text-tx-muted">
              Activation covers scope and planning only. Build deposit and ongoing support are handled separately.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-body font-medium text-tx-heading">
        {label}
        {required && <span className="ml-0.5 text-brand-orange">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-border px-4 py-3 text-body focus:border-border-focus focus:outline-none transition-colors"
      />
    </div>
  );
}
