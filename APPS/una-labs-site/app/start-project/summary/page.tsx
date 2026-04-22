import type { Metadata } from 'next';
import { ProjectActivationSummaryClient } from './ProjectActivationSummaryClient';

export const metadata: Metadata = {
  title: 'Review Project Activation — Una Labs',
  description:
    'Review your activation fee, scope setup, and next steps before opening a custom project workspace.',
};

export default function StartProjectSummaryPage() {
  return <ProjectActivationSummaryClient />;
}
