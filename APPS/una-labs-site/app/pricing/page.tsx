import type { Metadata } from 'next';
import { PricingContent } from '@/components/sections/PricingContent';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Pricing and engagements — Una Labs',
  description:
    'Understand how Una Labs scopes clarity, pilot builds, production delivery, and ongoing product improvement.',
  path: '/pricing',
});

export default function PricingPage() {
  return <PricingContent />;
}
