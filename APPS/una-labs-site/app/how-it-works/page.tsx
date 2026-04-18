import type { Metadata } from 'next';
import { HowItWorksContent } from '@/components/sections/HowItWorksContent';

export const metadata: Metadata = {
  title: 'How It Works — Una Labs',
  description:
    'See how Una Labs turns rough requests into governed delivery. From intake through proposal to proof.',
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
