import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InvoiceClient } from '@/app/dashboard/invoice/InvoiceClient';
import { AssistantDrawer } from '@/components/AssistantDrawer';

export const metadata: Metadata = {
  title: 'Invoice',
  description: 'View your Una Labs project invoice.',
};

export default function InvoicePage() {
  return (
    <Suspense fallback={<div>Loading invoice...</div>}>
      <InvoiceClient />
      <AssistantDrawer />
    </Suspense>
  );
}
