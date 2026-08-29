import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'About - Una Labs',
  description: 'Una Labs is FTC\'s product lab, helping turn unclear problems into useful digital products.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <section className="bg-white pt-16 pb-24">
      <div className="max-w-narrow mx-auto px-6">
        <div className="mb-4 flex justify-center">
          <Badge variant="teal">Our story</Badge>
        </div>
        <h1 className="text-display-sm text-tx-heading text-center mb-6">
          A product lab for work worth making
        </h1>
        <div className="flex flex-col gap-6 text-body-lg text-tx-secondary leading-relaxed">
          <p>
            Una Labs exists because professional service delivery is broken. Clients arrive with rough
            ideas. Agencies ask for polished briefs. The gap between them costs everyone time, trust,
            and money.
          </p>
          <p>
            Una Labs closes that gap by helping people decide what should be made, shape a useful
            first version, and carry the work through design, build, launch, and improvement.
          </p>
          <p>
            Every part of the experience is designed to keep projects clear, accountable, and easy
            to move forward without endless back-and-forth.
          </p>
          <p>
            AI can help make something. We bring the judgement, product thinking, and delivery
            discipline that helps make it useful.
          </p>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Button href="/start" variant="primary" size="lg">Start Your Project</Button>
          <Button href="/how-it-works" variant="secondary" size="lg">See how it works</Button>
        </div>
      </div>
    </section>
  );
}
