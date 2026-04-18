'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { caseStudies, demoModules } from '@/lib/site-content';

export function DemoContent() {
  const [active, setActive] = useState(demoModules[0].slug);
  const module = demoModules.find((item) => item.slug === active) ?? demoModules[0];
  const studies = Object.values(caseStudies);

  return (
    <>
      <section className="bg-white">
        <div className="max-w-content mx-auto px-6 pt-16 pb-20">
          <div className="max-w-3xl">
            <Badge variant="teal">Demo library</Badge>
            <h1 className="mt-4 text-display text-tx-heading">See Una Labs in action</h1>
            <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
              This page is designed to hold Loom walkthroughs of the actual systems behind the brand.
              The structure is live now, and each slot is ready for the real recordings.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {demoModules.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setActive(item.slug)}
                  className={[
                    'rounded-full px-4 py-2 text-body-sm font-semibold transition-colors',
                    active === item.slug
                      ? 'bg-brand-teal text-white'
                      : 'bg-bg-offwhite text-tx-secondary hover:text-tx-heading',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-border bg-bg-offwhite p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="muted">{module.product}</Badge>
                <span className="text-body-sm text-tx-muted">Loom slot ready</span>
              </div>
              <h2 className="mt-4 text-h2 text-tx-heading">{module.title}</h2>
              <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
                {module.description}
              </p>

              <div className="mt-8 rounded-[24px] border-2 border-dashed border-border bg-white p-8">
                <p className="text-body font-semibold text-tx-heading">Recording placeholder</p>
                <p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">
                  {module.placeholder}
                </p>
                <ul className="mt-6 space-y-3">
                  {module.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-0.5 text-brand-teal">✦</span>
                      <span className="text-body-sm text-tx-body">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
              <Badge variant="teal">Next action</Badge>
              <h3 className="mt-4 text-h3 text-tx-heading">Use each walkthrough to reinforce the real product story</h3>
              <p className="mt-4 text-body-sm leading-relaxed text-tx-secondary">
                Each recording should feel like proof, not promo fluff. Show the real workflow,
                keep the narration tight, and link viewers back into the relevant surface.
              </p>
              <div className="mt-6">
                <Button href={module.cta.href} variant="primary" size="lg" external={module.cta.external}>
                  {module.cta.label}
                </Button>
              </div>
              <div className="mt-6 rounded-2xl bg-bg-offwhite p-5">
                <p className="text-body-sm font-semibold text-tx-heading">Recommended recording pattern</p>
                <ol className="mt-3 space-y-2 text-body-sm text-tx-secondary">
                  <li>1. Open on the real live route.</li>
                  <li>2. Show one complete flow from action to result.</li>
                  <li>3. End with the customer-visible outcome, not just the admin view.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl">
            <Badge variant="teal">Backed by live products</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">The demo page is tied to shipped systems</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              These case studies are the backbone of the recordings you will drop in here.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {studies.map((study) => (
              <div
                key={study.slug}
                className="rounded-[24px] border border-border bg-white p-6 shadow-sm"
              >
                <Badge variant="muted">{study.title}</Badge>
                <h3 className="mt-4 text-h4 text-tx-heading">{study.headline}</h3>
                <p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">
                  {study.subheadline}
                </p>
                <div className="mt-6">
                  <Button href={`/products/${study.slug}`} variant="ghost" size="md">
                    Open case study →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
