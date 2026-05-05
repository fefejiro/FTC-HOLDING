import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildPageMetadata } from '@/lib/metadata';

const FAQ = [
  {
    question: 'How does Una Labs engagement start?',
    answer:
      'Start at the intake flow, choose the right plan on the summary screen, and complete checkout through Stripe. The current public path is already live.',
  },
  {
    question: 'Is this a marketplace?',
    answer:
      'No. Una Labs is a delivery system and product studio, not a directory of freelancers.',
  },
  {
    question: 'What should I do if I need help before buying?',
    answer:
      'Use the contact page or email hello@unalabs.cloud. This Help Center is intentionally lightweight until the first support patterns settle.',
  },
];

export const metadata: Metadata = buildPageMetadata({
  title: 'Help Center — Una Labs',
  description:
    'Get oriented on the Una Labs intake, pricing, demos, and support path.',
  path: '/help',
});

export default function HelpPage() {
  return (
    <section className="bg-white">
      <div className="max-w-content mx-auto px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          <Badge variant="teal">Help Center</Badge>
          <h1 className="mt-4 text-display text-tx-heading">Need orientation before you start?</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            This is the first support layer for Una Labs: enough guidance to understand the buying path
            and where to go next, without drowning the site in placeholder support content.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/start" variant="primary" size="lg">
              Start Your Project
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Contact Una Labs
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {FAQ.map((item) => (
            <div
              key={item.question}
              className="rounded-[24px] border border-border bg-bg-offwhite p-6 shadow-sm"
            >
              <h2 className="text-h4 text-tx-heading">{item.question}</h2>
              <p className="mt-4 text-body-sm leading-relaxed text-tx-secondary">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
