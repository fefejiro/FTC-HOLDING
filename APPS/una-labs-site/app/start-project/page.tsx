import type { Metadata } from 'next';
import { ProjectActivationForm } from './ProjectActivationForm';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Start Your Project — Una Labs',
  description:
    'Open a concierge custom project through structured activation, scoped planning, and a clear next-step path.',
  path: '/start-project',
});

export default function StartProjectPage() {
  return <ProjectActivationForm />;
}
