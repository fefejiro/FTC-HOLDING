'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const STRIPE_LINK =
  process.env.NEXT_PUBLIC_STRIPE_BLUEPRINT_LINK || 'https://buy.stripe.com/test_REPLACE_ME';
const INTAKE_EMAIL = process.env.NEXT_PUBLIC_INTAKE_EMAIL || 'hello@unalabs.cloud';
const PRICE_LABEL = 'CAD $500';

const INCLUDED = [
  '1-page product brief written from your raw idea',
  'Target user + core problem statement (locked, never paraphrased)',
  'Feature list scoped to an MVP you can actually ship',
  '3 to 5 mockup screens of the primary flow',
  'Build roadmap with a realistic timeline + risk callouts',
  'Delivered as a PDF + Notion page within 5 business days',
];

const QUESTIONS = [
  { id: 'name', label: 'Your name', required: true, type: 'text', placeholder: 'Jane Doe' },
  { id: 'email', label: 'Email we should send the deliverable to', required: true, type: 'email', placeholder: 'you@company.com' },
  {
    id: 'projectName',
    label: 'What are you calling this idea? (working name is fine)',
    required: true,
    type: 'text',
    placeholder: 'e.g. AirTag Locator',
  },
  {
    id: 'problem',
    label: 'In plain language, what problem are you solving and for who?',
    required: true,
    type: 'textarea',
    placeholder: 'The rougher the better. We do the structuring.',
    rows: 5,
  },
  {
    id: 'mustHave',
    label: 'What 3 things does this absolutely need to do on day one?',
    required: true,
    type: 'textarea',
    placeholder: '1.\n2.\n3.',
    rows: 4,
  },
  {
    id: 'platform',
    label: 'Where does it live?',
    required: true,
    type: 'select',
    options: ['Web app', 'iOS app', 'Android app', 'iOS + Android', 'Hardware / IoT', 'Internal tool', 'Not sure'],
  },
  {
    id: 'timeline',
    label: 'When do you want this in clients\u2019 hands?',
    required: true,
    type: 'select',
    options: ['ASAP (this month)', '1\u20133 months', '3\u20136 months', 'Flexible'],
  },
  {
    id: 'reference',
    label: 'Any product you would point at and say \u201csomething like that\u201d? (optional link)',
    required: false,
    type: 'text',
    placeholder: 'https://\u2026 or leave blank',
  },
];

type FormState = Record<string, string>;

export function BlueprintContent() {
  const [form, setForm] = useState<FormState>({});
  const [submitted, setSubmitted] = useState(false);

  const mailtoHref = useMemo(() => {
    const lines = QUESTIONS.map((q) => {
      const v = (form[q.id] ?? '').trim();
      return `${q.label}\n${v || '(blank)'}\n`;
    }).join('\n');
    const subject = `Una Labs Blueprint intake \u2014 ${form.projectName || 'Untitled'}`;
    const body = `Submitted via unalabs.cloud/blueprint\n\n${lines}\n---\nNext step: confirm Stripe payment and reply with kickoff date.`;
    return `mailto:${INTAKE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [form]);

  function update(id: string, value: string) {
    setForm((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typeof window !== 'undefined') {
      window.location.href = mailtoHref;
    }
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-bg-offwhite">
      <section className="bg-white border-b border-border">
        <div className="max-w-content mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <Badge variant="orange">New \u00b7 Fixed-fee offer</Badge>
            <h1 className="mt-4 text-display text-tx-heading">
              Prototype Blueprint \u2014 turn your idea into a buildable plan in 5 days
            </h1>
            <p className="mt-4 text-body-lg text-tx-secondary leading-relaxed">
              You describe the idea in plain language. We turn it into a 1-page brief, a feature list scoped
              to an MVP, mockup screens of the primary flow, and a build roadmap. Fixed price.
              No discovery meetings. No quote-by-quote.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href={STRIPE_LINK} variant="primary" size="lg" external>
                Pay {PRICE_LABEL} and start
              </Button>
              <a href="#intake" className="text-body-sm font-semibold text-brand-teal hover:underline">
                Or fill the intake first \u2193
              </a>
            </div>
            <p className="mt-3 text-caption text-tx-muted">
              Payment first. Intake second. Delivery within 5 business days of payment + intake received.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-content mx-auto px-6 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-h2 text-tx-heading">What you get</h2>
            <ul className="mt-6 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-body text-tx-body">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4L8.5 12 15.3 5.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <p className="text-body-sm font-semibold text-tx-heading">How this works</p>
            <ol className="mt-4 space-y-4 text-body-sm text-tx-secondary">
              <li><span className="font-semibold text-tx-heading">1. Pay {PRICE_LABEL}.</span> Stripe checkout, 30 seconds.</li>
              <li><span className="font-semibold text-tx-heading">2. Fill the intake below.</span> Eight questions. Rough is fine.</li>
              <li><span className="font-semibold text-tx-heading">3. We build the blueprint.</span> Within 5 business days.</li>
              <li><span className="font-semibold text-tx-heading">4. You decide what\u2019s next.</span> Build with us, with someone else, or sit on it. The brief is yours either way.</li>
            </ol>
            <p className="mt-6 text-caption text-tx-muted">
              Want to build it after? The {PRICE_LABEL} is credited toward an MVP build engagement.
            </p>
          </div>
        </div>
      </section>

      <section id="intake" className="bg-white border-y border-border py-16">
        <div className="max-w-narrow mx-auto px-6">
          <div className="max-w-2xl mb-8">
            <Badge variant="teal">Intake</Badge>
            <h2 className="mt-3 text-h2 text-tx-heading">Tell us about your idea</h2>
            <p className="mt-3 text-body text-tx-secondary">
              Eight questions. Takes about 5 minutes. Rougher is better \u2014 the structuring is our job.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-brand-teal/30 bg-brand-teal-light p-8">
              <h3 className="text-h3 text-tx-heading">Intake captured</h3>
              <p className="mt-2 text-body text-tx-secondary">
                Your email client should have opened with your answers ready to send to {INTAKE_EMAIL}.
                If not, copy your answers and email them directly. Once we receive payment + intake we
                kick off within one business day.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {!form.email || !form.projectName ? null : (
                  <Button href={mailtoHref} variant="secondary" size="md">Resend intake email</Button>
                )}
                <Button href={STRIPE_LINK} variant="primary" size="md" external>Pay {PRICE_LABEL} and start</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {QUESTIONS.map((q) => (
                <div key={q.id}>
                  <label htmlFor={q.id} className="block text-body-sm font-semibold text-tx-heading mb-2">
                    {q.label}
                    {q.required && <span className="ml-1 text-brand-orange">*</span>}
                  </label>
                  {q.type === 'textarea' ? (
                    <textarea
                      id={q.id}
                      name={q.id}
                      required={q.required}
                      placeholder={q.placeholder}
                      rows={q.rows ?? 4}
                      value={form[q.id] ?? ''}
                      onChange={(e) => update(q.id, e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-4 py-3 text-body text-tx-body placeholder:text-tx-muted focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 focus:outline-none"
                    />
                  ) : q.type === 'select' ? (
                    <select
                      id={q.id}
                      name={q.id}
                      required={q.required}
                      value={form[q.id] ?? ''}
                      onChange={(e) => update(q.id, e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-4 py-3 text-body text-tx-body focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 focus:outline-none"
                    >
                      <option value="" disabled>Choose one</option>
                      {(q.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={q.id}
                      name={q.id}
                      type={q.type}
                      required={q.required}
                      placeholder={q.placeholder}
                      value={form[q.id] ?? ''}
                      onChange={(e) => update(q.id, e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-4 py-3 text-body text-tx-body placeholder:text-tx-muted focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 focus:outline-none"
                    />
                  )}
                </div>
              ))}

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Button type="submit" variant="primary" size="lg">Send intake</Button>
                <Button href={STRIPE_LINK} variant="secondary" size="lg" external>
                  Pay {PRICE_LABEL} now
                </Button>
              </div>
              <p className="text-caption text-tx-muted">
                Submitting opens your email client with the answers ready to send to {INTAKE_EMAIL}.
                We use your email only to deliver the blueprint and follow up on this engagement.
              </p>
            </form>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-narrow mx-auto px-6 text-center">
          <h2 className="text-h2 text-tx-heading">Questions before paying?</h2>
          <p className="mt-3 text-body text-tx-secondary">
            Email <a href={`mailto:${INTAKE_EMAIL}`} className="text-brand-teal hover:underline">{INTAKE_EMAIL}</a> or use the contact form. We reply same day.
          </p>
          <div className="mt-6">
            <Link href="/contact" className="text-body-sm font-semibold text-brand-teal hover:underline">Open contact form \u2192</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
