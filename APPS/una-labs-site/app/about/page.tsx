import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'About — Una Labs',
  description: 'Una Labs is a professional service delivery platform built for teams who deliver with confidence.',
};

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
            We built a platform that closes that gap — structured intake, scoped proposals, governed
            delivery, and documented proof. Everything a team needs to deliver with confidence, from
            first request to final sign-off.
          </p>
          <p>
            No retainers. No ambiguity. Just clear scope, agreed terms, and handoff-ready output.
          </p>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Button href="/start" variant="primary" size="lg">Start a request</Button>
          <Button href="/how-it-works" variant="secondary" size="lg">See how it works</Button>
        </div>
      </div>
    </section>
  );
}
