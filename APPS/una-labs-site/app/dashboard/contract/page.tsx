import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ContractClient } from '@/app/dashboard/contract/ContractClient';

export const metadata: Metadata = {
  title: 'Engagement Letter',
  description: 'Review and sign your Una Labs engagement letter.',
};

export default function ContractPage() {
  return (
    <Suspense fallback={<div>Loading contract...</div>}>
      <ContractClient />
    </Suspense>
  );
}
