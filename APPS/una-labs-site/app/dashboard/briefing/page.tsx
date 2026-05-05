import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BriefingClient } from './BriefingClient';
import { AssistantDrawer } from '@/components/AssistantDrawer';

export const metadata: Metadata = {
  title: 'Client Briefing | Una Labs',
  description: 'Project briefing board — status, milestones, and evidence in one place.',
};

export default function BriefingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-body text-tx-muted animate-pulse">Loading briefing…</p></div>}>
      <BriefingClient />
      <AssistantDrawer />
    </Suspense>
  );
}
