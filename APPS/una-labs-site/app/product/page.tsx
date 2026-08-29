import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { caseStudies, productPages } from '@/lib/site-content';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Selected Work — Una Labs',
  description:
    'Explore products and delivery systems Una Labs has shaped as FTC\'s product lab.',
  path: '/product',
});

export default function ProductOverviewPage() {
  const products = Object.values(productPages);
  const studies = Object.values(caseStudies);

  return (
    <>
      <section className="bg-white">
        <div className="max-w-content mx-auto px-6 pt-16 pb-20">
          <div className="max-w-3xl">
            <Badge variant="teal">Selected work</Badge>
            <h1 className="mt-4 text-display text-tx-heading">
              Products built from questions worth asking
            </h1>
            <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
              Una Labs is FTC\'s product lab. We explore real problems, build useful systems, and share
              the work so you can see how we think.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="/start" variant="primary" size="lg">
                Start Your Project
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
                    Explore the capability →
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
            <Badge variant="teal">A portfolio of useful bets</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">The work is the proof</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              These products show how we move from a human problem to a product people can use.
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
