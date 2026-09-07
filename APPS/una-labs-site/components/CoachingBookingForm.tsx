'use client';

import { useState } from 'react';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { CoachingPrice } from '@/components/CoachingPrice';

type FormState = {
  name: string;
  email: string;
  timezone: string;
  availability: string;
  focus: string;
};

const initialState: FormState = { name: '', email: '', timezone: '', availability: '', focus: '' };

export function CoachingBookingForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(getStripeApiUrl('/api/coaching/create-session'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || 'Could not start secure checkout.');
      window.location.assign(result.url);
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'Could not start secure checkout.');
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[28px] border border-border bg-white p-6 shadow-sm sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-body-sm font-semibold text-tx-heading">Your name
          <input required autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} className="mt-2 w-full rounded-lg border border-border px-4 py-3 text-body text-tx-heading outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" />
        </label>
        <label className="block text-body-sm font-semibold text-tx-heading">Email address
          <input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="mt-2 w-full rounded-lg border border-border px-4 py-3 text-body text-tx-heading outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" />
        </label>
      </div>
      <label className="mt-5 block text-body-sm font-semibold text-tx-heading">Your time zone
        <input required placeholder="For example: America/Toronto" value={form.timezone} onChange={(event) => update('timezone', event.target.value)} className="mt-2 w-full rounded-lg border border-border px-4 py-3 text-body text-tx-heading outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" />
      </label>
      <label className="mt-5 block text-body-sm font-semibold text-tx-heading">A few times that work for you
        <textarea required rows={4} maxLength={500} placeholder="For example: Tuesday 6–8pm, Thursday after 5pm" value={form.availability} onChange={(event) => update('availability', event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-border px-4 py-3 text-body text-tx-heading outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" />
      </label>
      <label className="mt-5 block text-body-sm font-semibold text-tx-heading">What would you like to work on? <span className="font-normal text-tx-muted">Optional</span>
        <textarea rows={3} maxLength={500} placeholder="A task, idea, or question is enough." value={form.focus} onChange={(event) => update('focus', event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-border px-4 py-3 text-body text-tx-heading outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" />
      </label>
      {status === 'error' && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-body-sm text-red-700">{error}</p>}
      <button type="submit" disabled={status === 'loading'} className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-brand-orange px-6 py-4 text-body font-semibold text-white shadow-orange transition-colors hover:bg-brand-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
        {status === 'loading' ? 'Opening secure checkout…' : <CoachingPrice prefix="Continue to secure checkout — " />}
      </button>
      <p className="mt-4 text-center text-caption text-tx-muted">Payment is handled by Stripe. We will confirm the exact session time within one business day.</p>
    </form>
  );
}
