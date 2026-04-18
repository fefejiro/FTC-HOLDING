'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { PRICING_TIERS } from '@/lib/constants';

const FAQ = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — 14 days free, no credit card required. You get full access to all features on your selected plan.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards via Stripe. Annual plans can also be invoiced.',
  },
  {
    q: "Is my data secure?",
    a: 'Yes. All data is encrypted at rest and in transit. We use industry-standard security practices and regular audits.',
  },
  {
    q: "What counts as a 'project'?",
    a: 'Any active engagement with a client — from intake through to signed-off delivery.',
  },
];

export function PricingContent() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const getPrice = (monthly: number) =>
    billing === 'annual' ? monthly * 10 : monthly;

  return (
    <>
      {/* Hero */}
      <section className="bg-white pt-16 pb-12 text-center">
        <div className="max-w-content mx-auto px-6">
          <h1 className="text-display-sm text-tx-heading mb-4">
            The perfect plan for your business
          </h1>
          <p className="text-body-lg text-tx-secondary mb-8">
            Simple, transparent pricing. No hidden fees.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center rounded-lg border border-border p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={[
                'px-5 py-2 rounded-md text-body font-medium transition-colors',
                billing === 'monthly'
                  ? 'bg-brand-teal text-white'
                  : 'text-tx-secondary hover:text-tx-heading',
              ].join(' ')}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={[
                'px-5 py-2 rounded-md text-body font-medium transition-colors flex items-center gap-2',
                billing === 'annual'
                  ? 'bg-brand-teal text-white'
                  : 'text-tx-secondary hover:text-tx-heading',
              ].join(' ')}
            >
              Annual
              <span className="text-caption font-bold uppercase px-1.5 py-0.5 rounded bg-brand-orange text-white">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="bg-bg-offwhite py-12 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-content mx-auto px-6">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={[
                'relative bg-white rounded-xl p-8',
                tier.recommended
                  ? 'border-2 border-brand-teal shadow-teal shadow-md'
                  : 'border border-border shadow-sm',
              ].join(' ')}
            >
              {tier.recommended && (
                <span className="absolute top-4 right-4 text-caption font-bold uppercase px-2 py-1 rounded-full bg-brand-orange text-white">
                  Recommended
                </span>
              )}

              <h3 className="text-h3 text-tx-heading mb-1">{tier.name}</h3>
              <p className="text-body-sm text-tx-secondary mb-4">{tier.description}</p>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[11px] font-bold text-tx-muted uppercase tracking-wider mr-0.5">CA</span>
                <span className="text-5xl font-bold text-tx-heading">
                  ${getPrice(tier.monthlyPrice).toLocaleString('en-CA')}
                </span>
                <span className="text-body-sm text-tx-secondary">/mo</span>
              </div>
              <p className="text-[10px] text-tx-muted mb-5">CAD, billed {billing === 'annual' ? 'annually' : 'monthly'}</p>

              <ul className="flex flex-col gap-2 mb-6 list-none p-0 m-0">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-body-sm text-tx-body">
                    <span className="text-brand-teal font-bold flex-shrink-0 mt-0.5" aria-hidden="true">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                href={tier.name === 'Enterprise' ? '/contact' : '/start'}
                variant={tier.recommended ? 'primary' : 'secondary'}
                size="md"
                className="w-full justify-center"
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-caption text-tx-muted mt-8">
          No credit card required. 14 days free on all plans.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20">
        <div className="max-w-narrow mx-auto px-6">
          <h2 className="text-h2 text-tx-heading text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="flex flex-col divide-y divide-border">
            {FAQ.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full text-left flex justify-between items-center py-5 gap-4 text-body font-semibold text-tx-heading hover:text-brand-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 rounded"
                >
                  {item.q}
                  <span
                    className={`text-tx-muted flex-shrink-0 transition-transform duration-150 ${
                      openFaq === i ? 'rotate-45' : ''
                    }`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-body text-tx-secondary leading-relaxed">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTASection />
    </>
  );
}
