import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LaunchGateClient } from '@/app/dashboard/launch-gate/LaunchGateClient';

export const metadata: Metadata = {
  title: 'Launch Gate',
  description: 'Operator launch-readiness board for project release decisions.',
};

export default function DashboardLaunchGatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-offwhite flex items-center justify-center">
          <p className="text-body text-tx-muted animate-pulse">Loading launch gate...</p>
        </div>
      }
    >
      <LaunchGateClient />
    </Suspense>
  );
}
