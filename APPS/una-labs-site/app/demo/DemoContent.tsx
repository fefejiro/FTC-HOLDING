'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { caseStudies, demoModules } from '@/lib/site-content';
import { WorkflowAnimation } from '@/components/WorkflowAnimation';
import { demoSteps } from '@/components/demoSteps';
import { SparkWidget } from '@/components/SparkWidget';

export function DemoContent() {
  const [active, setActive] = useState(demoModules[0].slug);
  const demoModule = demoModules.find((item) => item.slug === active) ?? demoModules[0];
  const studies = Object.values(caseStudies);

  return (
    <>
      <section className="bg-white">
        <div className="max-w-content mx-auto px-6 pt-16 pb-20">
          <div className="max-w-3xl">
            <Badge variant="teal">Product walkthroughs</Badge>
            <h1 className="mt-4 text-display text-tx-heading">Watch the real systems work</h1>
            <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
              Every walkthrough below shows a live, deployed product, not a mockup or a slide deck.
              Choose a workflow and see exactly how Una Labs delivers.
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
                <Badge variant="muted">{demoModule.product}</Badge>
              </div>
              <h2 className="mt-4 text-h2 text-tx-heading">{demoModule.title}</h2>
              <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
                {demoModule.description}
              </p>

              {demoModule.loomUrl ? (
                <div className="mt-6 w-full overflow-hidden rounded-2xl border border-border bg-black" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={demoModule.loomUrl}
                    title={demoModule.title}
                    loading="lazy"
                    className="h-full w-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <WorkflowAnimation steps={demoSteps[demoModule.slug] ?? demoSteps.intake} />
              )}

              <ul className="mt-6 space-y-3">
                {demoModule.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-0.5 text-brand-teal">+</span>
                    <span className="text-body-sm text-tx-body">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
              <Badge variant="teal">Try it live</Badge>
              <h3 className="mt-4 text-h3 text-tx-heading">
                Every workflow shown here is running in production
              </h3>
              <p className="mt-4 text-body-sm leading-relaxed text-tx-secondary">
                These are not demos built for the website. Each product is live, serving real users,
                and ready to be inspected, not just watched.
              </p>
              <div className="mt-6">
                <Button href={demoModule.cta.href} variant="primary" size="lg" external={demoModule.cta.external}>
                  {demoModule.cta.label}
                </Button>
              </div>
              <div className="mt-6 rounded-2xl bg-bg-offwhite p-5">
                <p className="text-body-sm font-semibold text-tx-heading">What sets these apart</p>
                <ul className="mt-3 space-y-2 text-body-sm text-tx-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-teal mt-0.5">+</span>
                    Real users, real data flows, not seeded demos.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-teal mt-0.5">+</span>
                    Each product has been launched, iterated, and maintained.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-teal mt-0.5">+</span>
                    What you see here is what we build for clients.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl">
            <Badge variant="teal">Shipped products</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">The companies behind the walkthroughs</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              Each walkthrough above is drawn from one of these live products. Read the case study to
              understand the problem, the build, and the outcome.
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
                    Read case study
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SparkWidget />
    </>
  );
}
