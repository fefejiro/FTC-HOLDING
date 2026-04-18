import type { Metadata } from 'next';
import { ProductPage } from '@/components/templates/ProductPage';

export const metadata: Metadata = {
  title: 'Real-Time Dashboard — Una Labs',
  description:
    'See every active project at a glance. Status, milestones, and risk signals — for your team and your clients.',
};

export default function DashboardPage() {
  return (
    <ProductPage
      featureTitle="Real-Time Dashboard"
      eyebrow="Stay informed"
      headline="See every project at a glance"
      accentPhrase="at a glance"
      subheadline="One dashboard. Every project. Real-time status, progress tracking, and risk signals — for your team and your clients."
      problemStatement="When clients can't see project status, anxiety fills the gap. Update requests pile up. Trust erodes. Time gets wasted on communication instead of delivery."
      solutionBody="The Una Labs dashboard gives your team and your clients a live view of every active project — status, milestones, risks, and timelines — without a single manual update."
      keyFeatures={[
        {
          icon: '📊',
          title: 'Live project status',
          description: 'Every project shows current stage, blockers, and next milestone — updated in real time.',
        },
        {
          icon: '👁️',
          title: 'Client-facing view',
          description: 'Share a live project view with clients. No login required on their end.',
        },
        {
          icon: '⚠️',
          title: 'Risk signals',
          description: 'Flagged blockers and timeline slippage surface automatically — before they become problems.',
        },
      ]}
      testimonialQuote="The dashboard alone is worth it. Our clients stopped sending 'where are we at?' emails the day we went live."
      testimonialAuthor="Priya Nair"
      testimonialTitle="Agency Principal"
      testimonialCompany="Nair Creative"
      ctaPrimaryLabel="See the dashboard"
      ctaPrimaryHref="/start"
    />
  );
}
