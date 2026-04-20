import type { Metadata } from 'next';
import { RealtorIntakeForm } from './RealtorIntakeForm';

export const metadata: Metadata = {
  title: 'Realtor AI Lead System — Una Labs',
  description: 'Build your AI-powered lead qualification system. 14-day free trial. No credit card required.',
};

export default function RealtorPage() {
  return <RealtorIntakeForm />;
}
