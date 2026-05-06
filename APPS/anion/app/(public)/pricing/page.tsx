'use client';

import { useState } from 'react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: '4 sessions per month, 1 subject',
    features: ['4 tutoring sessions/month', '1 subject', 'Session recordings', 'Email support'],
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$89',
    period: '/month',
    description: '8 sessions per month, up to 3 subjects',
    features: [
      '8 tutoring sessions/month',
      'Up to 3 subjects',
      'Session recordings',
      'Priority scheduling',
      'Progress reports',
    ],
    highlight: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: '$149',
    period: '/month',
    description: 'Unlimited sessions, all subjects, priority tutors',
    features: [
      'Unlimited sessions',
      'All subjects',
      'Priority tutor matching',
      'Session recordings',
      'Weekly progress reports',
      'Dedicated support',
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    setLoading(planId);
    setError(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: 'direct-subscribe',
          planId,
          successUrl: `${window.location.origin}/parent?subscribed=1`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = (await res.json()) as { ok: boolean; url?: string; message?: string; code?: string };

      if (!data.ok || !data.url) {
        if (data.code === 'UNAUTHENTICATED') {
          window.location.href = '/login?next=/pricing';
          return;
        }
        throw new Error(data.message ?? 'Checkout failed');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">
            Plans &amp; Pricing
          </p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Invest in your child&#39;s success
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            All plans include live one-on-one sessions with vetted tutors. Cancel anytime.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? 'bg-indigo-600 text-white shadow-2xl scale-105'
                  : 'bg-white text-gray-900 border border-gray-200 shadow-md'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h2>
                <p className={`text-sm mb-4 ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-indigo-200' : 'text-indigo-600'}`}>
                      ✓
                    </span>
                    <span className={plan.highlight ? 'text-indigo-100' : 'text-gray-600'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={loading !== null}
                onClick={() => handleSubscribe(plan.id)}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-60 ${
                  plan.highlight
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {loading === plan.id ? 'Redirecting…' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Payments are processed securely by Stripe. No card stored on our servers.
        </p>
      </div>
    </main>
  );
}
