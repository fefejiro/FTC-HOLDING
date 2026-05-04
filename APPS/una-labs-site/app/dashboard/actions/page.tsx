import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ActionCenterClient } from '@/app/dashboard/actions/ActionCenterClient';

export const metadata: Metadata = {
  title: 'Action Center',
  description: 'Operator lane for milestone approvals and change requests.',
};

export default function DashboardActionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-offwhite flex items-center justify-center">
          <p className="text-body text-tx-muted animate-pulse">Loading action center...</p>
        </div>
      }
    >
      <ActionCenterClient />
    </Suspense>
  );
}
