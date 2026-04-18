import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { caseStudies, proofHighlights } from '@/lib/site-content';

export function SocialProofSection() {
  const studies = Object.values(caseStudies);

  return (
    <section className="bg-bg-subtle py-20">
      <div className="max-w-content mx-auto px-6">
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <Badge variant="teal">Built proof</Badge>
          </div>
          <h2 className="text-h2 text-tx-heading">
            The Una Labs story is backed by live systems
          </h2>
          <p className="mt-4 text-body-lg text-tx-secondary max-w-narrow mx-auto">
            This is not placeholder credibility. The public brand is supported by real products,
            live payments, and an actual request-to-activation flow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-12">
          {proofHighlights.map((metric) => (
            <div
              key={metric.label}
              className="bg-white border border-border rounded-xl p-8 shadow-sm"
            >
              <span className="block text-5xl font-bold text-brand-orange leading-none">
                {metric.value}
              </span>
              <strong className="block mt-3 text-h4 text-tx-heading">{metric.label}</strong>
              <p className="mt-1 text-body-sm text-tx-secondary">{metric.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
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
                  View case study →
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
