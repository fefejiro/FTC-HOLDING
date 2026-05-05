import type { Metadata } from 'next';
import { HowItWorksContent } from '@/components/sections/HowItWorksContent';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'How It Works — Una Labs',
  description:
    'See how Una Labs turns rough requests into governed delivery. From intake through proposal to proof.',
  path: '/how-it-works',
});

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
