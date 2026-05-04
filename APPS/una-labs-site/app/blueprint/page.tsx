import type { Metadata } from 'next';
import { BlueprintContent } from './BlueprintContent';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Prototype Blueprint — Una Labs',
  description:
    'Pay $500 CAD and get a structured product brief, MVP feature list, mockup screens, and build roadmap delivered in 5 business days.',
  path: '/blueprint',
});

export default function BlueprintPage() {
  return <BlueprintContent />;
}
