import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { caseStudies, productPages } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Platform Overview',
  description:
    'Explore the full Una Labs system across intake, dashboard, client portal, reporting, and approval surfaces.',
};

export default function ProductOverviewPage() {
  const products = Object.values(productPages);
  const studies = Object.values(caseStudies);

  return (
    <>
      <section className="bg-white">
        <div className="max-w-content mx-auto px-6 pt-16 pb-20">
          <div className="max-w-3xl">
            <Badge variant="teal">Platform overview</Badge>
            <h1 className="mt-4 text-display text-tx-heading">
              The Una Labs platform is built around the full delivery path
            </h1>
            <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
              Intake, scope, visibility, client communication, reporting, and final sign-off should
              feel like one product system. This page maps the surfaces that make that possible.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="/start" variant="primary" size="lg">
                Start a request
              </Button>
              <Button href="/how-it-works" variant="secondary" size="lg">
                See the workflow
              </Button>
            </div>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.slug}
                className="rounded-[24px] border border-border bg-bg-offwhite p-6 shadow-sm"
              >
                <span className="mb-4 block text-3xl" aria-hidden="true">
                  {product.icon}
                </span>
                <h2 className="text-h3 text-tx-heading">{product.navLabel}</h2>
                <p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">
                  {product.navDescription}
                </p>
                <p className="mt-4 text-body-sm leading-relaxed text-tx-body">
                  {product.subheadline}
                </p>
                <div className="mt-6">
                  <Button href={`/product/${product.slug}`} variant="ghost" size="md">
                    Open surface →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl">
            <Badge variant="teal">Real proof</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">These surfaces are backed by shipped products</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              Una Labs is not presenting a theory of delivery. The brand is backed by live products
              and real operational software already in market.
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
                    View case study →
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
