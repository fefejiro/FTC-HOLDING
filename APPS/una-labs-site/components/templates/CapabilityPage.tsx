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
import type {
  ProductPageContent,
  SolutionPageContent,
  VisualKey,
} from '@/lib/site-content';

type CapabilityContent = ProductPageContent | SolutionPageContent;

const VISUALS: Record<VisualKey, ComponentType> = {
  intake: StepRequestMockup,
  proposal: StepProposalMockup,
  dashboard: DashboardMockup,
  reporting: ReportMockup,
  handoff: HandoffMockup,
  delivery: StepDeliveryMockup,
};

function renderHeadline(headline: string, accentPhrase?: string) {
  if (!accentPhrase || !headline.includes(accentPhrase)) {
    return <h1 className="text-display text-tx-heading">{headline}</h1>;
  }

  const [before, after] = headline.split(accentPhrase);
  return (
    <h1 className="text-display text-tx-heading">
      {before}
      <span className="text-brand-orange">{accentPhrase}</span>
      {after}
    </h1>
  );
}

export function CapabilityPage({ page }: { page: CapabilityContent }) {
  const HeroVisual = VISUALS[page.heroVisual as VisualKey];

  return (
    <>
      <section className="bg-white overflow-hidden">
        <div className="max-w-content mx-auto px-6 pt-16 pb-20">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4">
                <Badge variant="teal">{page.eyebrow}</Badge>
              </div>
              {renderHeadline(page.headline, page.accentPhrase)}
              <p className="mt-6 text-body-lg text-tx-secondary leading-relaxed">
                {page.subheadline}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button href={page.primaryAction.href} variant="primary" size="lg" external={page.primaryAction.external}>
                  {page.primaryAction.label}
                </Button>
                <Button href={page.secondaryAction.href} variant="secondary" size="lg" external={page.secondaryAction.external}>
                  {page.secondaryAction.label}
                </Button>
              </div>
            </div>

            <div className="relative lg:pl-6">
              <div
                className="absolute inset-0 rounded-[32px] bg-brand-teal-light opacity-80"
                style={{ transform: 'rotate(-3deg) scale(0.98)' }}
                aria-hidden="true"
              />
              <div className="relative rounded-[28px] border border-border bg-white p-4 shadow-lg">
                <HeroVisual />
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {page.heroStats.map((stat) => (
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
          {[page.challenge, page.approach].map((block) => (
            <div
              key={block.title}
              className="rounded-[28px] border border-border bg-white p-8 shadow-sm"
            >
              <Badge variant="muted">{block.eyebrow}</Badge>
              <h2 className="mt-4 text-h2 text-tx-heading">{block.title}</h2>
              <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
                {block.body}
              </p>
              <ul className="mt-6 space-y-3">
                {block.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 text-brand-teal">✦</span>
                    <span className="text-body text-tx-body">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-2xl">
            <Badge variant="teal">How this capability helps</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Built around the people doing the work</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              {page.featureIntro}
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {page.features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[24px] border border-border bg-bg-offwhite p-6 shadow-sm"
              >
                <span className="mb-4 block text-3xl" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="text-h4 text-tx-heading">{feature.title}</h3>
                <p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-2xl">
            <Badge variant="teal">How it fits</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Bring the right capability to the next decision</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              {page.relatedIntro}
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {page.related.map((item) => (
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
