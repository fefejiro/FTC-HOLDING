import { Suspense } from 'react';
import { InstantBillClient } from './InstantBillClient';

export const metadata = { title: 'Instant Bill — Una Labs' };

export default function InstantBillPage() {
  return (
    <Suspense>
      <InstantBillClient />
    </Suspense>
  );
}
