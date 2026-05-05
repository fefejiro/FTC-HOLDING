import type { Metadata } from 'next';
import { SchedulingClient } from '@/app/dashboard/scheduling/SchedulingClient';

export const metadata: Metadata = {
  title: 'Scheduling',
  description: 'Schedule and track milestone review slots and delivery checkpoints.',
};

export default function SchedulingPage() {
  return <SchedulingClient />;
}
