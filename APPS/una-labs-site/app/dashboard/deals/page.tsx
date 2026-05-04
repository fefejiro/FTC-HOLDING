import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DealsClient } from '@/app/dashboard/deals/DealsClient';
import { AssistantDrawer } from '@/components/AssistantDrawer';

export const metadata: Metadata = {
  title: 'Deals Pipeline',
  description: 'Track inbound leads and prospects through to close.',
};

export default function DealsPage() {
  return (
    <>
      <Suspense>
        <DealsClient />
      </Suspense>
      <AssistantDrawer />
    </>
  );
}
