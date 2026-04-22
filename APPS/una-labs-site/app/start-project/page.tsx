import type { Metadata } from 'next';
import { ProjectActivationForm } from './ProjectActivationForm';

export const metadata: Metadata = {
  title: 'Start Your Project — Una Labs',
  description:
    'Open a concierge custom project through structured activation, scoped planning, and a clear next-step path.',
};

export default function StartProjectPage() {
  return <ProjectActivationForm />;
}
