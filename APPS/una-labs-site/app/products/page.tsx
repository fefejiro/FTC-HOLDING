import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProductMark } from '@/components/brand/ProductMark';
import { shippedProducts } from '@/lib/site-content';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Products built by Una Labs',
  description: 'Explore PeacePad, SayWetin, Dispatch, UnaScout, Just Checking In and JobAgent — products built and operated by Una Labs.',
  path: '/products',
});

export default function ProductsPage() {
  return (
    <>
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="max-w-3xl">
            <Badge variant="teal">Una Labs portfolio</Badge>
            <h1 className="mt-5 text-display text-tx-heading">Products built from real needs.</h1>
            <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
              We build our own products so the work stays grounded in real people, real constraints, and real use. Explore what is live, what is improving, and what is on its way.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="/start-project" variant="primary" size="lg">Build a product with us</Button>
              <Button href="/product" variant="ghost" size="lg">See our delivery platform →</Button>
            </div>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shippedProducts.map((product) => {
              const platforms = [product.web, product.ios, product.android].filter(Boolean);
              return (
                <article key={product.slug} className="flex min-h-[340px] flex-col rounded-[28px] border border-border bg-bg-offwhite p-6 transition-shadow hover:shadow-lg sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <ProductMark name={product.name} icon={product.icon} size="lg" />
                    <Badge variant={product.maturity === 'Live' || product.maturity === 'Available' ? 'teal' : 'muted'}>{product.maturity}</Badge>
                  </div>
                  <h2 className="mt-6 text-h3 text-tx-heading">{product.name}</h2>
                  <p className="mt-3 text-body leading-relaxed text-tx-secondary">{product.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <span key={`${product.slug}-${platform!.platform}`} className="rounded-full border border-border bg-white px-2.5 py-1 text-caption font-medium text-tx-secondary">
                        {platform!.platform} · {platform!.status}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-4 pt-7">
                    {product.liveUrl && <Button href={product.liveUrl} variant="ghost" size="sm" external>Open product ↗</Button>}
                    {product.caseStudyUrl && <Button href={product.caseStudyUrl} variant="ghost" size="sm">View case study →</Button>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-16 sm:py-20">
        <div className="mx-auto grid max-w-content gap-8 px-6 lg:grid-cols-[1fr_.8fr] lg:items-center">
          <div>
            <Badge variant="orange">Have a problem worth solving?</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Your product could be next.</h2>
            <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-tx-secondary">Una Labs helps founders and teams turn a rough idea into a clear, dependable product with the right scope, thoughtful design, and proof at every stage.</p>
          </div>
          <div className="lg:justify-self-end"><Button href="/start-project" variant="dark" size="lg">Start your project →</Button></div>
        </div>
      </section>
    </>
  );
}
