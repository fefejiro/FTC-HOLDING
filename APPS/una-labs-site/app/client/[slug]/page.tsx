import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CLIENT_SITES, getClientSite } from '@/lib/client-sites';
import { ClientPortalPage } from './ClientPortalPage';

export function generateStaticParams() {
  return CLIENT_SITES.map((site) => ({ slug: site.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = getClientSite(slug);
  if (!site) return { title: 'Not Found' };
  return {
    title: `${site.clientName} | Client Portal`,
    description: site.description,
  };
}

export default async function ClientSlugPage({
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
          <p className="text-body text-tx-muted animate-pulse">Loading...</p>
        </div>
      }
    >
      <ClientPortalPage site={site} />
    </Suspense>
  );
}
