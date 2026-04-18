import type { Metadata } from 'next';
import { SummaryClient } from './SummaryClient';

export const metadata: Metadata = {
  title: 'Review & Pay — Una Labs',
  description: 'Review your plan and start your free trial.',
};

export default function SummaryPage() {
  return <SummaryClient />;
}
