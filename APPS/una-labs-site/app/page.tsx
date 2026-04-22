import type { Metadata } from 'next';
import { HeroSection } from '@/components/sections/HeroSection';
import { FeatureCarousel } from '@/components/sections/FeatureCarousel';
import { SocialProofSection } from '@/components/sections/SocialProofSection';
import { ProblemSolutionSection } from '@/components/sections/ProblemSolutionSection';
import { IndustryGrid } from '@/components/sections/IndustryGrid';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PROBLEM_SOLUTIONS } from '@/lib/constants';
import { DashboardMockup, ReportMockup, HandoffMockup } from '@/components/ui/ProductMockups';

export const metadata: Metadata = {
  title: 'Una Labs - AI Launchpad for Founders',
  description:
    'Una Labs is a concierge custom-project operating system for founders. Structured intake, scoped plans, governed delivery, and measurable proof from first conversation to delivered work.',
};

const IMAGE_POSITIONS = ['right', 'left', 'right'] as const;
const BACKGROUNDS = ['white', 'subtle', 'white'] as const;
const MOCKUPS = [DashboardMockup, ReportMockup, HandoffMockup] as const;

export default function HomePage() {
  return (
    <>
      <HeroSection
        eyebrow="Una Labs - AI Launchpad for Founders"
        headline="From client request to delivered project, with proof."
        accentPhrase="with proof."
        subheadline="Una Labs structures your intake, scopes the work with AI, and gives every project a live client workspace. Your clients see exactly where things stand, what is waiting on them, and what comes next."
        ctaPrimaryLabel="Start Your Project"
        ctaPrimaryHref="/start-project"
        ctaSecondaryLabel="Watch a Demo"
        ctaSecondaryHref="/demo"
        frictionNote="Activation opens the workspace and scoped plan. Build deposit comes after approval."
      />

      <section className="bg-bg-offwhite border-y border-border/70">
        <div className="max-w-content mx-auto px-6 py-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <Badge variant="orange">New vertical live</Badge>
            <h2 className="mt-3 text-h2 text-tx-heading">Realtor intake is now a first-class entry point</h2>
            <p className="mt-2 text-body text-tx-secondary max-w-2xl">Use the dedicated realtor route when you want to demo AI lead qualification, CRM handoff, and follow-up automation without forcing a generic intake story.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button href="/realtor" variant="primary" size="md">Open Realtor Flow</Button>
            <Button href="/product/dashboard" variant="secondary" size="md">View Real-Time Dashboard</Button>
          </div>
        </div>
      </section>

      <FeatureCarousel />

      <SocialProofSection />

      {PROBLEM_SOLUTIONS.map((ps, i) => (
        <ProblemSolutionSection
          key={ps.headline}
          {...ps}
          imagePosition={IMAGE_POSITIONS[i]}
          background={BACKGROUNDS[i]}
          MockupComponent={MOCKUPS[i]}
        />
      ))}

      <IndustryGrid />

      <FinalCTASection />
    </>
  );
}
