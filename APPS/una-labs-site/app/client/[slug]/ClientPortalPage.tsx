'use client';

import { useSearchParams } from 'next/navigation';
import { ClientSiteShell } from '@/components/templates/ClientSiteShell';
import type { ClientSiteConfig } from '@/lib/client-sites';

export function ClientPortalPage({ site }: { site: ClientSiteConfig }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id') ?? undefined;

  return (
    <ClientSiteShell
      clientName={site.clientName}
      primaryColor={site.primaryColor}
      logoUrl={site.logoUrl}
      projectId={projectId}
    >
      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-2">
          {site.clientName}
        </p>
        <h1 className="text-display text-tx-heading">{site.description}</h1>
        <p className="mt-4 text-body text-tx-secondary">
          Select a surface from the navigation above to view your project details.
        </p>
      </div>
    </ClientSiteShell>
  );
}
