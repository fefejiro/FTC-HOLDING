'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { STRIPE_API_URL } from '@/lib/stripe-config';

function ConfirmationContent() {
  const params = useSearchParams();
  const sessionId = params.get('session_id') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [planLabel, setPlanLabel] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const raw = sessionStorage.getItem('una_intake');
    let plan = '';

    let parsedIntake: Record<string, unknown> | null = null;

    if (raw) {
      try {
        parsedIntake = JSON.parse(raw) as Record<string, unknown>;
        plan = typeof parsedIntake.plan === 'string' ? parsedIntake.plan : '';
      } catch {
        // Ignore invalid session storage payloads and continue with activation.
      }
    }

    const labels: Record<string, string> = {
      starter: 'Starter',
      professional: 'Professional',
      agency: 'Agency',
      enterprise: 'Enterprise',
    };

    setPlanLabel(labels[plan] ?? 'Professional');

    fetch(`${STRIPE_API_URL}/api/activate-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, intake: parsedIntake }),
    })
      .then((response) => {
        setStatus(response.ok ? 'success' : 'error');
      })
      .catch(() => setStatus('error'));
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body text-tx-muted">Activating your trial...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-tight w-full bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-h2 text-tx-heading mb-2">Something went wrong</h1>
          <p className="text-body text-tx-secondary mb-6">
            Your payment may have gone through, but Una Labs could not finish activation automatically.
            Email <a href="mailto:hello@unalabs.cloud" className="text-brand-teal underline">hello@unalabs.cloud</a> and we will sort it out quickly.
          </p>
          <Link href="/pricing" className="text-brand-teal font-medium hover:underline">
            Back to pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-offwhite flex items-center justify-center px-6">
      <div className="max-w-tight w-full bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
        <div className="w-16 h-16 bg-brand-teal rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-display-sm text-tx-heading mb-2">You're in. Trial started.</h1>
        <p className="text-body text-tx-secondary mb-8">
          Your <strong>{planLabel}</strong> 14-day free trial is active. No charge until day 15.
        </p>

        <div className="text-left flex flex-col gap-3 mb-8">
          {[
            ['Check your access path', 'Use the login route once your workspace access is ready, or contact us if you need help getting in.'],
            ['Set up your workspace', 'Add your team, configure intake forms, and shape the first real project flow.'],
            ['Open the dashboard', 'The dashboard route is now wired for authenticated project visibility and Supabase-backed data.'],
          ].map(([title, desc], index) => (
            <div key={index} className="flex gap-3 p-4 bg-bg-offwhite rounded-xl">
              <span className="w-6 h-6 rounded-full bg-brand-teal text-white text-[11px] font-bold flex-shrink-0 flex items-center justify-center mt-0.5">
                {index + 1}
              </span>
              <div>
                <p className="text-body-sm font-semibold text-tx-heading">{title}</p>
                <p className="text-body-sm text-tx-secondary">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/login?redirect=/dashboard"
          className="inline-block px-8 py-4 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors"
        >
          Log in to dashboard
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-offwhite flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
