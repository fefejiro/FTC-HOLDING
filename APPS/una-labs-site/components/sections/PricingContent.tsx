'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { ENGAGEMENT_PATHS } from '@/lib/constants';

const FAQ = [
  {
    q: 'Do you publish fixed prices?',
    a: 'We publish the shape of the engagement. The price depends on scope, risk, integrations, and the people involved, so we quote it after the clarity phase.',
  },
  {
    q: 'Is the clarity phase paid?',
    a: 'Yes. It is a defined piece of work that can stand alone. If we proceed, we can discuss how it fits into the next phase.',
  },
  {
    q: 'Do you build websites?',
    a: 'Yes, when a website is the right product surface. We also build workflows, internal tools, AI-assisted systems, and other digital products.',
  },
  {
    q: 'Can we start with an existing idea?',
    a: 'Absolutely. Rough context is enough to begin. We help turn the unfinished version into a decision, a scope, and a practical next step.',
  },
];

export function PricingContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <section className="bg-white pt-16 pb-12 text-center">
        <div className="max-w-content mx-auto px-6">
          <p className="text-caption font-bold uppercase tracking-wider text-brand-teal">A clearer way to buy</p>
          <h1 className="mt-3 text-display-sm text-tx-heading">
            Start with clarity. Pay for the work that follows.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-body-lg text-tx-secondary">
            We do not force every problem into a subscription tier. We understand the opportunity first, then recommend the smallest useful engagement.
          </p>
        </div>
      </section>

      <section className="bg-bg-offwhite py-12 pb-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-content mx-auto px-6">
          {ENGAGEMENT_PATHS.map((path, index) => (
            <div
              key={path.name}
              className={`relative rounded-xl bg-white p-8 shadow-sm ${index === 0 ? 'border-2 border-brand-teal shadow-teal' : 'border border-border'}`}
            >
              {index === 0 && (
                <span className="absolute right-5 top-5 rounded-full bg-brand-orange px-2.5 py-1 text-caption font-bold uppercase text-white">
                  Start here
                </span>
              )}
              <p className="text-caption font-bold uppercase tracking-wider text-brand-teal">{path.eyebrow}</p>
              <h2 className="mt-3 text-h3 text-tx-heading">{path.name}</h2>
              <p className="mt-3 min-h-[3.5rem] text-body text-tx-secondary">{path.description}</p>
              <p className="mt-6 text-body-sm font-semibold text-tx-heading">{path.priceLabel}</p>
              <ul className="mt-5 flex list-none flex-col gap-2 p-0">
                {path.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-body-sm text-tx-body">
                    <span className="mt-0.5 flex-shrink-0 font-bold text-brand-teal" aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Button href={path.href} variant={index === 0 ? 'primary' : 'secondary'} size="md">
                  {path.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-white py-20">
        <div className="mx-auto grid max-w-content items-start gap-10 px-6 lg:grid-cols-2">
          <div>
            <p className="text-caption font-bold uppercase tracking-wider text-brand-orange">Before a build quote</p>
            <h2 className="mt-3 text-h2 text-tx-heading">A useful first decision comes before a big estimate.</h2>
            <p className="mt-4 text-body leading-relaxed text-tx-secondary">
              The clarity phase gives both sides something durable to work from. It can lead into a build, or help you make a confident decision not to build yet.
            </p>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 rounded-2xl border border-border bg-bg-subtle p-6">
            {['Problem framing', 'Solution direction', 'Practical scope', 'A clear recommendation for what comes next'].map((item) => (
              <li key={item} className="flex items-start gap-3 text-body text-tx-body">
                <span className="mt-0.5 font-bold text-brand-teal" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-narrow px-6">
          <h2 className="mb-12 text-center text-h2 text-tx-heading">Frequently asked questions</h2>
          <div className="flex flex-col divide-y divide-border">
            {FAQ.map((item, index) => (
              <div key={item.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  aria-expanded={openFaq === index}
                  className="flex w-full items-center justify-between gap-4 rounded py-5 text-left text-body font-semibold text-tx-heading transition-colors hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                >
                  {item.q}
                  <span className={`flex-shrink-0 text-tx-muted transition-transform duration-150 ${openFaq === index ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
                </button>
                {openFaq === index && <p className="pb-5 text-body leading-relaxed text-tx-secondary">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTASection />
    </>
  );
}
