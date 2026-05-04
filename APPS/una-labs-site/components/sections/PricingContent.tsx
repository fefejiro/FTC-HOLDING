'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { PRICING_TIERS } from '@/lib/constants';

const FAQ = [
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Free plan lets you run intake and proposal flow for one active project with no credit card.',
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
    q: "What counts as an active project?",
    a: 'Any active engagement with a client — from intake through to signed-off delivery.',
  },
];

const COMPETITOR_ROWS = [
  { feature: 'Built-in intake + scope workflow', una: 'Yes', monday: 'No', honeybook: 'Partial', ignition: 'Partial' },
  { feature: 'Contracts + e-sign + payments', una: 'Yes', monday: 'No', honeybook: 'Yes', ignition: 'Yes' },
  { feature: 'Delivery gates + handoff proof', una: 'Yes', monday: 'Partial', honeybook: 'No', ignition: 'No' },
  { feature: 'AI-assisted pricing insights', una: 'Yes', monday: 'No', honeybook: 'No', ignition: 'No' },
  { feature: 'Entry pricing', una: '$0 / $39', monday: '$12+/user', honeybook: '$19+', ignition: '$79+' },
];

export function PricingContent() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const getPriceLabel = (tier: (typeof PRICING_TIERS)[number]) => {
    if (tier.customPricing || tier.name === 'Enterprise') {
      return 'Custom';
    }

    const price = billing === 'annual' ? tier.monthlyPrice * 10 : tier.monthlyPrice;
    return `$${price.toLocaleString('en-CA')}`;
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-white pt-16 pb-12 text-center">
        <div className="max-w-content mx-auto px-6">
          <h1 className="text-display-sm text-tx-heading mb-4">
            Pricing built for modern delivery teams
          </h1>
          <p className="text-body-lg text-tx-secondary mb-8">
            Use Una Labs as your delivery platform, or hire Una Labs to run delivery for you.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-content mx-auto px-6">
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
                {!tier.customPricing && <span className="text-[11px] font-bold text-tx-muted uppercase tracking-wider mr-0.5">CA</span>}
                <span className="text-5xl font-bold text-tx-heading">
                  {getPriceLabel(tier)}
                </span>
                {!tier.customPricing && <span className="text-body-sm text-tx-secondary">/mo</span>}
              </div>
              <p className="text-[10px] text-tx-muted mb-5">
                {tier.customPricing
                  ? 'Tailored pricing for advanced compliance, integration, and SLA requirements.'
                  : `CAD, billed ${billing === 'annual' ? 'annually' : 'monthly'}`}
              </p>

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
          Annual pricing saves 2 months. Checkout and invoicing are secured through Stripe.
        </p>
      </section>

      <section className="bg-white py-20 border-t border-border">
        <div className="max-w-content mx-auto px-6 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-h2 text-tx-heading mb-3">Need execution, not just software?</h2>
            <p className="text-body text-tx-secondary leading-relaxed">
              Una Labs runs a hybrid model. You can subscribe to the platform and execute with your team, or hire Una Labs to scope and deliver projects as a managed service.
            </p>
            <ul className="mt-5 space-y-2">
              {['Fixed-fee project scoping in CAD', 'Milestone-governed delivery with sign-offs', 'Contracts, billing, and handoff proof included'].map((item) => (
                <li key={item} className="flex items-start gap-2 text-body-sm text-tx-body">
                  <span className="text-brand-teal font-bold mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button href="/start" variant="primary" size="lg">
                Start Managed Delivery
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="bg-bg-subtle px-5 py-4 border-b border-border">
              <h3 className="text-h4 text-tx-heading">How Una Labs compares</h3>
              <p className="text-body-sm text-tx-secondary mt-1">Compared against Monday.com, HoneyBook, and Ignition.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-tx-muted border-b border-border">
                    <th className="px-4 py-3 font-semibold">Capability</th>
                    <th className="px-4 py-3 font-semibold">Una Labs</th>
                    <th className="px-4 py-3 font-semibold">Monday</th>
                    <th className="px-4 py-3 font-semibold">HoneyBook</th>
                    <th className="px-4 py-3 font-semibold">Ignition</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPETITOR_ROWS.map((row) => (
                    <tr key={row.feature} className="border-b border-border last:border-b-0 text-body-sm">
                      <td className="px-4 py-3 text-tx-heading font-medium">{row.feature}</td>
                      <td className="px-4 py-3 text-brand-teal font-semibold">{row.una}</td>
                      <td className="px-4 py-3 text-tx-secondary">{row.monday}</td>
                      <td className="px-4 py-3 text-tx-secondary">{row.honeybook}</td>
                      <td className="px-4 py-3 text-tx-secondary">{row.ignition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
