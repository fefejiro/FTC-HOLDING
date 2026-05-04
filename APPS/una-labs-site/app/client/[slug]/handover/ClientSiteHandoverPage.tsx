'use client';

import { useSearchParams } from 'next/navigation';
import { ClientSiteShell } from '@/components/templates/ClientSiteShell';
import { HandoverClient } from '@/app/dashboard/handover/HandoverClient';
import type { ClientSiteConfig } from '@/lib/client-sites';

export function ClientSiteHandoverPage({ site }: { site: ClientSiteConfig }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id') ?? undefined;
  const base = `/client/${site.slug}`;

  return (
    <ClientSiteShell
      clientName={site.clientName}
      primaryColor={site.primaryColor}
      logoUrl={site.logoUrl}
      projectId={projectId}
      nav={[
        { label: 'Portal', href: `${base}/portal` },
        { label: 'Report', href: `${base}/report` },
        { label: 'Contract', href: `${base}/contract` },
        { label: 'Briefing', href: `${base}/briefing` },
        { label: 'Handover', href: `${base}/handover` },
      ]}
    >
      <HandoverClient />
    </ClientSiteShell>
  );
}
