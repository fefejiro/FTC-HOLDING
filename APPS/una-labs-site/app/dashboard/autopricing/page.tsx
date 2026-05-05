import { Suspense } from 'react';
import { AutoPricingClient } from './AutoPricingClient';

export const metadata = { title: 'AutoPricing — Una Labs' };

export default function AutoPricingPage() {
  return (
    <Suspense>
      <AutoPricingClient />
    </Suspense>
  );
}
