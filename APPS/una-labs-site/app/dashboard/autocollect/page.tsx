import { Suspense } from 'react';
import { AutoCollectClient } from './AutoCollectClient';

export const metadata = { title: 'AutoCollect — Una Labs' };

export default function AutoCollectPage() {
  return (
    <Suspense>
      <AutoCollectClient />
    </Suspense>
  );
}
