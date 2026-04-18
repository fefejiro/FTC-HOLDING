import type { Metadata } from 'next';
import { DashboardClient } from '@/app/dashboard/DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'The authenticated Una Labs dashboard for projects, milestones, and delivery visibility.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
