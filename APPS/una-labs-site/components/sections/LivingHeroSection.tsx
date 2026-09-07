import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function LivingHeroSection() {
  return (
    <section className="overflow-hidden bg-white pb-20 pt-14 lg:pb-24 lg:pt-20">
      <div className="mx-auto grid max-w-content items-center gap-12 px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        <div className="max-w-xl">
          <Badge variant="teal">Una Labs · product studio</Badge>
          <h1 className="mt-5 text-display text-tx-heading">Useful products, built from real needs.</h1>
          <p className="mt-6 max-w-lg text-body-lg leading-relaxed text-tx-secondary">
            We turn practical problems into clear, dependable digital products. Bring us the need; we help shape the idea, build the right thing, and carry it into the real world.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/start" variant="primary" size="lg">Start Your Project</Button>
            <Button href="/product" variant="ghost" size="lg">Explore our products →</Button>
          </div>
          <p className="mt-4 text-caption text-tx-muted">Strategy, design, engineering, launch, and ongoing product care.</p>
        </div>

        <aside className="relative overflow-hidden rounded-[32px] bg-[#0B0E11] p-7 text-white shadow-xl sm:p-10" aria-label="How Una Labs works">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full border-[34px] border-brand-teal/20" aria-hidden="true" />
          <div className="relative max-w-md">
            <p className="text-eyebrow uppercase tracking-[0.16em] text-brand-teal">What we do</p>
            <p className="mt-7 font-display text-[clamp(1.8rem,3.7vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em]">
              From a rough problem to something people can actually use.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-7 text-body-sm">
              <p><span className="block font-semibold">Shape</span><span className="text-white/55">Find the useful core.</span></p>
              <p><span className="block font-semibold">Build</span><span className="text-white/55">Make it dependable.</span></p>
              <p><span className="block font-semibold">Launch</span><span className="text-white/55">Put it into the world.</span></p>
              <p><span className="block font-semibold">Improve</span><span className="text-white/55">Learn from real use.</span></p>
            </div>
            <div className="mt-8 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-teal">Also at Una Labs</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <p className="max-w-[250px] text-body-sm leading-relaxed text-white/75">Practical one-to-one AI learning shaped around the work, ideas, and problems that matter to you.</p>
                <Button href="/learn" variant="ghost" size="sm" className="!text-white hover:!text-brand-teal">View learning →</Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
