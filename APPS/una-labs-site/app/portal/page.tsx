import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PortalClient } from '@/app/portal/PortalClient';
import { AssistantDrawer } from '@/components/AssistantDrawer';

export const metadata: Metadata = {
  title: 'Project Portal',
  description: 'Track your Una Labs project progress.',
};

export default function PortalPage() {
  return (
    <Suspense fallback={<div>Loading portal...</div>}>
      <PortalClient />
      <AssistantDrawer />
    </Suspense>
  );
}