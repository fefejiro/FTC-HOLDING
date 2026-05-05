import { Suspense } from 'react';
import { IntegrationsClient } from './IntegrationsClient';

export const metadata = { title: 'Integrations — Una Labs' };

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsClient />
    </Suspense>
  );
}
