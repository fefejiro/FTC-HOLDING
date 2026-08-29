import type { ComponentType } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import {
  DashboardMockup,
  HandoffMockup,
  ReportMockup,
  StepDeliveryMockup,
  StepProposalMockup,
  StepRequestMockup,
} from '@/components/ui/ProductMockups';
import type { CaseStudyContent, VisualKey } from '@/lib/site-content';

const VISUALS: Record<VisualKey, ComponentType> = {
  intake: StepRequestMockup,
  proposal: StepProposalMockup,
  dashboard: DashboardMockup,
  reporting: ReportMockup,
  handoff: HandoffMockup,
  delivery: StepDeliveryMockup,
};

export function CaseStudyPage({ study }: { study: CaseStudyContent }) {
  const HeroVisual = VISUALS[study.heroVisual as VisualKey];

  return (
    <>
      <section className="bg-white">
        <div className="max-w-content mx-auto px-6 pt-16 pb-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <Badge variant="teal">{study.eyebrow}</Badge>
              <h1 className="mt-4 text-display text-tx-heading">{study.headline}</h1>
              <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
                {study.subheadline}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button href={study.primaryAction.href} variant="primary" size="lg" external={study.primaryAction.external}>
                  {study.primaryAction.label}
                </Button>
                <Button href={study.secondaryAction.href} variant="secondary" size="lg" external={study.secondaryAction.external}>
                  {study.secondaryAction.label}
                </Button>
              </div>
              <p className="mt-4 text-body-sm text-tx-muted">
                Explore the product surface:{' '}
                <a className="text-brand-teal hover:underline" href={study.liveUrl} target="_blank" rel="noreferrer">
                  Open product →
                </a>
              </p>
            </div>

            <div className="rounded-[28px] border border-border bg-brand-teal-light p-4 shadow-lg">
              <div className="rounded-[24px] border border-border bg-white p-4">
                <HeroVisual />
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {study.heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-bg-offwhite p-5"
              >
                <p className="text-3xl font-black leading-none text-brand-orange">{stat.value}</p>
                <p className="mt-2 text-body font-semibold text-tx-heading">{stat.label}</p>
                <p className="mt-1 text-body-sm text-tx-secondary">{stat.detail}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      <section className="bg-bg-offwhite py-20">
        <div className="max-w-content mx-auto grid gap-6 px-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-border bg-white p-8 shadow-sm">
            <Badge variant="muted">{study.challenge.eyebrow}</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">{study.challenge.title}</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              {study.challenge.body}
            </p>
            <ul className="mt-6 space-y-3">
              {study.challenge.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 text-brand-teal">✦</span>
                  <span className="text-body text-tx-body">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-border bg-white p-8 shadow-sm">
            <Badge variant="muted">{study.impact.eyebrow}</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">{study.impact.title}</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              {study.impact.body}
            </p>
            <ul className="mt-6 space-y-3">
              {study.impact.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 text-brand-teal">✦</span>
                  <span className="text-body text-tx-body">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-2xl">
            <Badge variant="teal">What shipped</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Product work worth examining</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              These are the parts of the build that make the case study useful as proof, not just a screenshot gallery.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {study.shipped.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-border bg-bg-offwhite p-6 shadow-sm"
              >
                <span className="mb-4 block text-3xl" aria-hidden="true">
                  {item.icon}
                </span>
                <h3 className="text-h4 text-tx-heading">{item.title}</h3>
                <p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-2xl">
            <Badge variant="teal">Where it points next</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Use this proof to understand the wider system</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              These related pages connect the case study back to the actual Una Labs operating model.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {study.related.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-border bg-white p-6 shadow-sm"
              >
                <Badge variant="muted">{item.eyebrow}</Badge>
                <h3 className="mt-4 text-h4 text-tx-heading">{item.title}</h3>
                <p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">
                  {item.description}
                </p>
                <div className="mt-6">
                  <Button href={item.href} variant="ghost" size="md" external={item.external}>
                    {item.hrefLabel} →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTASection />
    </>
  );
}
