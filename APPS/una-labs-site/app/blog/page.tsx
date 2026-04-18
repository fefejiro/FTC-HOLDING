import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'The Una Labs journal for delivery systems, product operations, AI workflow, and shipped product notes.',
};

const UPCOMING_TOPICS = [
  'What we learned shipping the Una Labs intake and Stripe flow live',
  'Why operational software earns more trust than generic AI marketing',
  'How shipped products like Dispatch, PeacePad, and Saywetin shape the Una Labs quality bar',
];

export default function BlogPage() {
  return (
    <section className="bg-white">
      <div className="max-w-content mx-auto px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          <Badge variant="teal">Journal</Badge>
          <h1 className="mt-4 text-display text-tx-heading">The writing surface is live. The first posts are next.</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            This section will carry product notes, delivery-system thinking, and build stories from the
            real Una Labs ecosystem. The structure is in place now so the public surface no longer dead-ends.
          </p>
        </div>

        <div className="mt-12 rounded-[28px] border border-border bg-bg-offwhite p-8 shadow-sm">
          <p className="text-body font-semibold text-tx-heading">First topics queued up</p>
          <ul className="mt-6 space-y-4">
            {UPCOMING_TOPICS.map((topic) => (
              <li key={topic} className="flex items-start gap-3">
                <span className="mt-0.5 text-brand-teal">✦</span>
                <span className="text-body text-tx-body">{topic}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/demo" variant="secondary" size="lg">
              Watch the demos
            </Button>
            <Button href="/products/dispatch" variant="ghost" size="lg">
              Explore case studies →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
