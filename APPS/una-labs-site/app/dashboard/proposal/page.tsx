import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProposalClient } from '@/app/dashboard/proposal/ProposalClient';

export const metadata: Metadata = {
  title: 'Project Proposal',
  description: 'Your Una Labs project proposal and scope.',
};

export default function ProposalPage() {
  return (
    <Suspense fallback={<div>Loading proposal...</div>}>
      <ProposalClient />
    </Suspense>
  );
}