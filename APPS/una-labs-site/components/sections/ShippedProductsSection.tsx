import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { shippedProducts } from '@/lib/site-content';

export function ShippedProductsSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Badge variant="teal">Shipped products</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Real products. Honest release states.</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">Browse the work, try what is open, and see where each product is heading.</p>
          </div>
          <Button href="/product" variant="ghost" size="md">View the product index →</Button>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shippedProducts.map((product) => {
            const platforms = [product.ios, product.android, product.web].filter(Boolean);
            return (
              <article key={product.slug} className="group rounded-[24px] border border-border bg-bg-offwhite p-6 transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal-light text-2xl text-brand-teal" aria-hidden="true">{product.icon}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-caption font-semibold text-tx-secondary">{product.maturity}</span>
                </div>
                <h3 className="mt-5 text-h4 text-tx-heading">{product.name}</h3>
                <p className="mt-2 min-h-[52px] text-body-sm leading-relaxed text-tx-secondary">{product.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {platforms.map((platform) => <span key={platform!.platform} className="rounded-full border border-border bg-white px-2.5 py-1 text-caption font-medium text-tx-secondary">{platform!.platform} · {platform!.status}</span>)}
                </div>
                <div className="mt-6 flex flex-wrap gap-4">
                  {product.liveUrl && <Button href={product.liveUrl} variant="ghost" size="sm" external>Open product →</Button>}
                  {product.caseStudyUrl && <Button href={product.caseStudyUrl} variant="ghost" size="sm">Case study →</Button>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
