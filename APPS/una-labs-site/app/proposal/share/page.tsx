import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProposalShareClient } from './ProposalShareClient';

export const metadata: Metadata = {
  title: 'Shared Proposal',
  description: 'Secure stakeholder view for a Una Labs proposal snapshot.',
};

export default function ProposalSharePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ProposalShareClient />
    </Suspense>
  );
}
