import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Services from Una Labs',
  description: 'Product strategy, design, engineering, launch support, and practical AI Learning from Una Labs.',
  path: '/services',
});

const services = [
  {
    number: '01',
    title: 'Product strategy and design',
    description: 'Turn a rough opportunity into a clearer product direction, useful user journey, and decision-ready scope.',
    href: '/start-project',
    label: 'Shape an idea',
  },
  {
    number: '02',
    title: 'Engineering and launch',
    description: 'Build dependable software with the right technical foundation, release plan, and proof at each handoff.',
    href: '/product',
    label: 'See how we deliver',
  },
  {
    number: '03',
    title: 'Launch and improvement support',
    description: 'Keep a live product moving with focused iteration, release readiness, and honest visibility into what comes next.',
    href: '/contact',
    label: 'Talk about support',
  },
  {
    number: '04',
    title: 'Practical AI Learning',
    description: 'Work through a real goal or difficult workflow and leave with a repeatable process you can continue using independently.',
    href: '/learn',
    label: 'Build a learning plan',
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="max-w-3xl">
            <Badge variant="teal">Una Labs services</Badge>
            <h1 className="mt-5 text-display text-tx-heading">Build clearly. Learn practically. Keep moving.</h1>
            <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
              Una Labs is a product studio. We help teams shape, build, launch, and improve useful software—and we offer practical one-to-one AI Learning as one additional service.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {services.map((service) => (
              <article key={service.number} className="flex min-h-[270px] flex-col rounded-[28px] border border-border bg-bg-offwhite p-7 sm:p-8">
                <span className="text-eyebrow font-semibold tracking-[0.2em] text-brand-teal">{service.number}</span>
                <h2 className="mt-5 text-h3 text-tx-heading">{service.title}</h2>
                <p className="mt-3 max-w-xl text-body leading-relaxed text-tx-secondary">{service.description}</p>
                <div className="mt-auto pt-7"><Button href={service.href} variant="ghost" size="sm">{service.label} →</Button></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-16 sm:py-20">
        <div className="mx-auto grid max-w-content gap-8 px-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Badge variant="orange">Start with the real need</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Tell us what you are trying to make or solve.</h2>
            <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-tx-secondary">We will help you find the right next step, whether that is a product engagement or a focused AI learning session.</p>
          </div>
          <Button href="/start-project" variant="dark" size="lg">Start your project →</Button>
        </div>
      </section>
    </>
  );
}
