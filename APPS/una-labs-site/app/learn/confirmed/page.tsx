'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStripeApiUrl } from '@/lib/stripe-config';

export default function CoachingConfirmedPage() {
  const [state, setState] = useState<'loading' | 'confirmed' | 'unconfirmed'>('loading');

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId) { setState('unconfirmed'); return; }
    fetch(`${getStripeApiUrl('/api/coaching/verify-session')}?session_id=${encodeURIComponent(sessionId)}`)
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => setState(response.ok && data.ok ? 'confirmed' : 'unconfirmed'))
      .catch(() => setState('unconfirmed'));
  }, []);

  if (state === 'loading') return <main className="mx-auto max-w-narrow px-6 py-24 text-center text-body text-tx-secondary">Confirming your booking…</main>;
  if (state === 'unconfirmed') return <main className="mx-auto max-w-narrow px-6 py-24 text-center"><h1 className="text-h2 text-tx-heading">We could not confirm that booking yet.</h1><p className="mt-4 text-body text-tx-secondary">If payment has completed, please check your Stripe receipt and contact us at hello@unalabs.cloud.</p><Link href="/learn" className="mt-7 inline-block text-body font-semibold text-brand-teal hover:underline">Return to coaching</Link></main>;
  return <main className="mx-auto max-w-narrow px-6 py-24 text-center"><p className="text-eyebrow uppercase tracking-[0.16em] text-brand-teal">Booking confirmed</p><h1 className="mt-4 text-display-sm text-tx-heading">You are on the list.</h1><p className="mt-5 text-body-lg leading-relaxed text-tx-secondary">We have your preferred times and will email you within one business day to confirm your 60-minute session.</p><Link href="/" className="mt-8 inline-block text-body font-semibold text-brand-teal hover:underline">Back to Una Labs</Link></main>;
}
