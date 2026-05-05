import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { demoModules } from '@/lib/site-content';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export async function generateStaticParams() {
  return demoModules.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const demoModule = demoModules.find((m) => m.slug === slug);
  if (!demoModule) return { title: 'Demo Not Found | Una Labs' };
  return {
    title: `${demoModule.title} | Una Labs Demo`,
    description: demoModule.description,
  };
}

const LIVE_URLS: Record<string, string> = {
  intake: '/start',
  dispatch: 'https://dispatch.unalabs.cloud',
  peacepad: 'https://peacepad.ca',
};

export default async function DemoSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demoModule = demoModules.find((m) => m.slug === slug);
  if (!demoModule) notFound();

  const liveUrl = LIVE_URLS[slug];
  const isExternal = liveUrl && liveUrl.startsWith('http');

  return (
    <main className="min-h-screen bg-bg-offwhite">
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-body-sm text-tx-muted">
          <Link href="/demo" className="hover:text-brand-teal transition-colors">All walkthroughs</Link>
          <span>/</span>
          <span className="text-tx-secondary">{demoModule.label}</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="teal">Demo</Badge>
            <Badge variant="muted">{demoModule.product}</Badge>
          </div>
          <h1 className="text-display text-tx-heading max-w-3xl">{demoModule.title}</h1>
          <p className="mt-4 text-body-lg text-tx-secondary leading-relaxed max-w-2xl">{demoModule.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {liveUrl && (
              <Button href={liveUrl} variant="primary" external={isExternal || undefined}>{demoModule.cta.label}</Button>
            )}
            <Button href="/demo" variant="secondary">All walkthroughs</Button>
          </div>
        </div>

        {/* Live product iframe OR clean feature grid */}
        {liveUrl ? (
          <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden mb-10">
            <div className="bg-bg-subtle border-b border-border px-5 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-300" />
                <span className="w-3 h-3 rounded-full bg-yellow-300" />
                <span className="w-3 h-3 rounded-full bg-green-300" />
              </div>
              <span className="text-body-sm text-tx-muted font-mono">{isExternal ? liveUrl : `unalabs.cloud${liveUrl}`}</span>
              {isExternal && (
                <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-[11px] font-semibold text-brand-teal hover:underline">
                  Open full screen ?
                </a>
              )}
            </div>
            <div className="relative w-full" style={{ height: '560px' }}>
              <iframe
                src={liveUrl}
                title={demoModule.title}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-white p-10 mb-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-teal/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-brand-teal">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-h4 text-tx-heading font-semibold">Live walkthrough in production</p>
            <p className="mt-2 text-body text-tx-secondary max-w-md mx-auto">{demoModule.placeholder}</p>
            <div className="mt-6">
              <Button href={demoModule.cta.href} variant="primary">{demoModule.cta.label}</Button>
            </div>
          </div>
        )}

        {/* Feature bullets */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {demoModule.bullets.map((bullet, idx) => (
            <div key={idx} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className="block text-brand-teal font-bold text-lg mb-3">+</span>
              <p className="text-body text-tx-body leading-relaxed">{bullet}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <h2 className="text-h2 text-tx-heading">Ready to see it live?</h2>
          <p className="mt-3 text-body text-tx-secondary max-w-xl mx-auto">
            This is a real system � not a prototype. Start your project and we will build it the same way.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/start" variant="primary" size="lg">Start your project</Button>
            <Button href="/demo" variant="secondary" size="lg">See all walkthroughs</Button>
          </div>
        </div>

      </div>
    </main>
  );
}
