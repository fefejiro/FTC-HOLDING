import { Suspense } from 'react';
import { AnalyticsClient } from './AnalyticsClient';

export const metadata = {
  title: 'Business Intelligence Dashboard',
  description: 'Real-time financial metrics, revenue analytics, and pipeline conversion insights.',
};

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-tx-secondary">Loading analytics...</div>}>
      <AnalyticsClient />
    </Suspense>
  );
}
