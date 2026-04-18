import type { Metadata } from 'next';
import { PricingContent } from '@/components/sections/PricingContent';

export const metadata: Metadata = {
  title: 'Pricing — Una Labs',
  description:
    'Simple, transparent pricing for professional service teams. Start free, upgrade when you\'re ready.',
};

export default function PricingPage() {
  return <PricingContent />;
}
