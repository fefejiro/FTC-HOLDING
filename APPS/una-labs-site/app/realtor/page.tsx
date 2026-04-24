import type { Metadata } from 'next';
import { RealtorIntakeForm } from './RealtorIntakeForm';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Realtor AI Lead System — Una Labs',
  description: 'Build your AI-powered lead qualification system with structured onboarding, routed handoff, and clear activation steps.',
  path: '/realtor',
});

export default function RealtorPage() {
  return <RealtorIntakeForm />;
}
