import { Suspense } from 'react';
import { BrandingClient } from './BrandingClient';

export const metadata = { title: 'Custom Branding — Una Labs' };

export default function BrandingPage() {
  return (
    <Suspense>
      <BrandingClient />
    </Suspense>
  );
}
