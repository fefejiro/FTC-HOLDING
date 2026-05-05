import type { Metadata } from 'next';
import { ProjectActivationSummaryClient } from './ProjectActivationSummaryClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Review Project Activation — Una Labs',
  description:
    'Review your activation fee, scope setup, and next steps before opening a custom project workspace.',
  path: '/start-project/summary',
});

export default function StartProjectSummaryPage() {
  return <ProjectActivationSummaryClient />;
}
