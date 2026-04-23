import type { Metadata } from 'next';
import { IntakeForm } from './IntakeForm';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Start Your Project — Una Labs',
  description: 'Start your project with a structured intake in minutes. Share your goal, choose your path, and continue to scoped activation.',
  path: '/start',
});

export default function StartPage() {
  return <IntakeForm />;
}
