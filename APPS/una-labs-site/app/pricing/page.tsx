import type { Metadata } from 'next';
import { PricingContent } from '@/components/sections/PricingContent';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Pricing — Una Labs',
  description:
    'Concierge delivery plans for founders and teams. Start your project with structured intake, scoped activation, and a clear path to shipped outcomes.',
  path: '/pricing',
});

export default function PricingPage() {
  return <PricingContent />;
}
