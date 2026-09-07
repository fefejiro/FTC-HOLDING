import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function LivingHeroSection() {
  return (
    <section className="overflow-hidden bg-white pt-14 pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto grid max-w-content items-center gap-12 px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        <div className="max-w-xl">
          <Badge variant="teal">Una Labs · practical AI learning</Badge>
          <h1 className="mt-5 text-display text-tx-heading">Learn AI in a way that helps you use it tomorrow.</h1>
          <p className="mt-6 max-w-lg text-body-lg leading-relaxed text-tx-secondary">
            One-to-one coaching for people who want calm, useful answers — without the jargon, pressure, or a room full of strangers.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/learn" variant="primary" size="lg">Book a coaching session</Button>
            <Button href="/start" variant="ghost" size="lg">Bring us a product idea →</Button>
          </div>
          <p className="mt-4 text-caption text-tx-muted">60 minutes · CAD $149 · beginner-friendly · secure checkout</p>
        </div>

        <aside className="relative overflow-hidden rounded-[32px] border border-[#d8ebe8] bg-brand-teal-light p-7 sm:p-10" aria-label="One-to-one AI coaching details">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand-orange-light" aria-hidden="true" />
          <div className="relative">
            <p className="text-eyebrow uppercase tracking-[0.16em] text-brand-teal">A quiet place to start</p>
            <blockquote className="mt-8 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-tight tracking-tight text-tx-heading">
              “I want to understand this properly, not just copy prompts.”
            </blockquote>
            <p className="mt-6 max-w-md text-body leading-relaxed text-tx-secondary">Bring the task in front of you. We will work through it together and leave you with a small, useful next step.</p>
            <dl className="mt-9 grid gap-4 border-t border-brand-teal/20 pt-6 sm:grid-cols-3">
              <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">Format</dt><dd className="mt-1 text-body-sm font-semibold text-tx-heading">1:1 online</dd></div>
              <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">Length</dt><dd className="mt-1 text-body-sm font-semibold text-tx-heading">60 minutes</dd></div>
              <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">Investment</dt><dd className="mt-1 text-body-sm font-semibold text-tx-heading">CAD $149</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
