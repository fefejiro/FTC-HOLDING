import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { demoModules } from '@/lib/site-content';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export async function generateStaticParams() {
  return demoModules.map((module) => ({ slug: module.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const module = demoModules.find((m) => m.slug === slug);
  if (!module) return { title: 'Demo Not Found | Una Labs' };
  return {
    title: `${module.title} | Una Labs Demo`,
    description: module.description,
  };
}

export default async function DemoSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const module = demoModules.find((m) => m.slug === slug);
  if (!module) notFound();

  return (
    <main className="min-h-screen bg-bg-offwhite">
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="teal">Demo</Badge>
            <Badge variant="muted">{module.product}</Badge>
            <Badge variant="muted">{module.label}</Badge>
          </div>
          <h1 className="text-display text-tx-heading max-w-3xl">{module.title}</h1>
          <p className="mt-4 text-body-lg text-tx-secondary leading-relaxed max-w-2xl">{module.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={module.cta.href} variant="primary">{module.cta.label}</Button>
            <Button href="/demo" variant="secondary">All walkthroughs</Button>
          </div>
        </div>

        {/* Walkthrough embed or placeholder */}
        <div className="rounded-3xl border border-border bg-white p-2 shadow-sm overflow-hidden mb-10">
          {module.arcadeUrl ? (
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={module.arcadeUrl}
                title={module.title}
                className="absolute inset-0 w-full h-full rounded-2xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : module.loomUrl ? (
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={module.loomUrl}
                title={module.title}
                className="absolute inset-0 w-full h-full rounded-2xl"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-bg-subtle flex items-center justify-center" style={{ minHeight: '400px' }}>
              <div className="text-center px-8 py-16">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-teal/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-brand-teal">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-h4 text-tx-heading font-semibold">Walkthrough coming soon</p>
                <p className="mt-2 text-body-sm text-tx-secondary max-w-xs">{module.placeholder}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bullets */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {module.bullets.map((bullet, idx) => (
            <div key={idx} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-brand-teal font-bold text-lg">+</span>
              </div>
              <p className="text-body text-tx-body leading-relaxed">{bullet}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <h2 className="text-h2 text-tx-heading">Ready to see it live?</h2>
          <p className="mt-3 text-body text-tx-secondary max-w-xl mx-auto">
            This is a real system — not a prototype. You can activate your own project today and we will build it the same way.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href={module.cta.href} variant="primary" size="lg">{module.cta.label}</Button>
            <Button href="/start" variant="secondary" size="lg">Start your project</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
