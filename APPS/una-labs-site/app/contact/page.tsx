'use client';

import { type FormEvent, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { STRIPE_API_URL } from '@/lib/stripe-config';

type Phase = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase('submitting');
    setErrorMsg('');

    try {
      const res = await fetch(`${STRIPE_API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), company: company.trim(), message: message.trim(), source: 'contact_form' }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'Submission failed.');
      setPhase('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setPhase('error');
    }
  }

  if (phase === 'success') {
    return (
      <section className="bg-white pt-16 pb-24">
        <div className="max-w-tight mx-auto px-6 text-center">
          <Badge variant="teal">Message received</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">We will be in touch</h1>
          <p className="mt-4 text-body-lg text-tx-secondary">
            Thanks for reaching out. Expect a reply within one business day.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white pt-16 pb-24">
      <div className="max-w-tight mx-auto px-6">
        <div className="mb-6 flex justify-center">
          <Badge variant="teal">Get in touch</Badge>
        </div>
        <h1 className="text-display-sm text-tx-heading text-center mb-4">Contact Una Labs</h1>
        <p className="text-body-lg text-tx-secondary text-center mb-10">
          Questions about pricing, enterprise plans, or partnerships? We respond within one business day.
        </p>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="contact-name" className="block text-body font-medium text-tx-heading mb-1">Name</label>
            <input id="contact-name" type="text" required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-body font-medium text-tx-heading mb-1">Email</label>
            <input id="contact-email" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label htmlFor="contact-company" className="block text-body font-medium text-tx-heading mb-1">Company <span className="text-tx-muted font-normal">(optional)</span></label>
            <input id="contact-company" type="text" placeholder="Your company or agency" value={company} onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-body font-medium text-tx-heading mb-1">Message</label>
            <textarea id="contact-message" rows={5} required placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus resize-none" />
          </div>
          {phase === 'error' && (
            <p className="text-body text-red-600">{errorMsg}</p>
          )}
          <button type="submit" disabled={phase === 'submitting'}
            className="w-full px-8 py-4 bg-brand-orange text-white font-semibold rounded-lg hover:bg-brand-orange-hover transition-all shadow-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:opacity-60">
            {phase === 'submitting' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>
    </section>
  );
}
