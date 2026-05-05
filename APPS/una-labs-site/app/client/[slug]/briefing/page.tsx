import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CLIENT_SITES, getClientSite } from '@/lib/client-sites';
import { ClientSiteBriefingPage } from './ClientSiteBriefingPage';

export function generateStaticParams() {
  return CLIENT_SITES.map((site) => ({ slug: site.slug }));
}

export default async function ClientBriefingSubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = getClientSite(slug);
  if (!site) notFound();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-offwhite flex items-center justify-center">
          <p className="text-body text-tx-muted animate-pulse">Loading briefing...</p>
        </div>
      }
    >
      <ClientSiteBriefingPage site={site} />
    </Suspense>
  );
}
