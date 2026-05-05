import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'About - Una Labs',
  description: 'Una Labs is a professional service delivery platform built for teams who deliver with confidence.',
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
          Built for teams who deliver
        </h1>
        <div className="flex flex-col gap-6 text-body-lg text-tx-secondary leading-relaxed">
          <p>
            Una Labs exists because professional service delivery is broken. Clients arrive with rough
            ideas. Agencies ask for polished briefs. The gap between them costs everyone time, trust,
            and money.
          </p>
          <p>
            The platform closes that gap with structured intake, scoped proposals, governed
            delivery, and documented proof. Everything your team needs to deliver with confidence,
            from first request to final sign-off.
          </p>
          <p>
            Every part of the experience is designed to keep projects clear, accountable, and easy
            to move forward without endless back-and-forth.
          </p>
          <p>
            No retainers. No ambiguity. Just clear scope, agreed terms, and handoff-ready output.
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
