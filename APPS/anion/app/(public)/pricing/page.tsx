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
    <div style={{ backgroundColor: 'var(--bg-offwhite)', minHeight: '100vh', paddingTop: 'var(--spacing-12)', paddingBottom: 'var(--spacing-12)', paddingLeft: 'var(--spacing-4)', paddingRight: 'var(--spacing-4)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-12)' }}>
          <p className="kicker" style={{ marginBottom: 'var(--spacing-3)' }}>Plans &amp; Pricing</p>
          <h1 className="display" style={{ marginBottom: 'var(--spacing-4)' }}>
            Invest in learning that sticks
          </h1>
          <p className="body" style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto' }}>
            All plans include live one-on-one sessions with vetted tutors, interactive whiteboards, and progress tracking. Cancel anytime.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 'var(--spacing-8)', padding: 'var(--spacing-4)', backgroundColor: 'rgba(185, 28, 28, 0.1)', border: '1px solid rgba(185, 28, 28, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div className="grid grid-3" style={{ gap: 'var(--spacing-8)' }}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="surface"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: 'var(--spacing-8)',
                backgroundColor: plan.highlight ? 'var(--brand-teal)' : 'var(--surface)',
                boxShadow: plan.highlight ? 'var(--shadow-xl)' : 'var(--shadow-md)',
                border: plan.highlight ? 'none' : '1px solid #e2e8f0',
                transform: plan.highlight ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
            >
              {plan.highlight && (
                <span style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--brand-orange)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: 'var(--spacing-1) var(--spacing-3)',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  Most Popular
                </span>
              )}

              <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <h2 className="h3" style={{ marginBottom: 'var(--spacing-2)', color: plan.highlight ? 'white' : 'var(--text-heading)' }}>
                  {plan.name}
                </h2>
                <p className="body-sm" style={{ marginBottom: 'var(--spacing-4)', color: plan.highlight ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)' }}>
                  {plan.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2)' }}>
                  <span style={{ fontSize: '36px', fontWeight: '700', color: plan.highlight ? 'white' : 'var(--text-heading)' }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: '14px', color: plan.highlight ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)' }}>
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul style={{ flex: 1, marginBottom: 'var(--spacing-8)', listStyle: 'none', padding: 0, margin: 0 }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)', fontSize: '14px' }}>
                    <span style={{ marginTop: '2px', flexShrink: 0, color: plan.highlight ? 'white' : 'var(--brand-teal)' }}>
                      ✓
                    </span>
                    <span style={{ color: plan.highlight ? 'rgba(255, 255, 255, 0.95)' : 'var(--text-body)' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={loading !== null}
                onClick={() => handleSubscribe(plan.id)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '600',
                  fontSize: '14px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor: plan.highlight ? 'white' : 'var(--brand-teal)',
                  color: plan.highlight ? 'var(--brand-teal)' : 'white',
                  transition: 'all 0.15s ease',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading === plan.id ? 'Redirecting…' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--spacing-12)' }}>
          Payments are processed securely by Stripe. No card stored on our servers.
        </p>
      </div>
    </div>
  );
}
