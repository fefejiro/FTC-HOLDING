import type { Metadata } from 'next';
import { IntakeForm } from './IntakeForm';

export const metadata: Metadata = {
  title: 'Start Free Trial — Una Labs',
  description: 'Start your 14-day free trial. No credit card required.',
};

export default function StartPage() {
  return <IntakeForm />;
}
