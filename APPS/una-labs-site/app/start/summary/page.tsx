import type { Metadata } from 'next';
import { SummaryClient } from './SummaryClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Review Project Activation — Una Labs',
  description: 'Review your selected plan, confirm terms, and continue to secure checkout.',
  path: '/start/summary',
});

export default function SummaryPage() {
  return <SummaryClient />;
}
