import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HandoverClient } from '@/app/dashboard/handover/HandoverClient';
import { AssistantDrawer } from '@/components/AssistantDrawer';

export const metadata: Metadata = {
  title: 'Project Handover',
  description: 'Review the final project handover summary and archived deliverables.',
};

export default function HandoverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-offwhite flex items-center justify-center">
          <p className="text-body text-tx-muted animate-pulse">Loading handover...</p>
        </div>
      }
    >
      <HandoverClient />
      <AssistantDrawer />
    </Suspense>
  );
}
