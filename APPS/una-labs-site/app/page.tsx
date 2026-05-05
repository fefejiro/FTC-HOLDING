import type { Metadata } from 'next';
import { HeroSection } from '@/components/sections/HeroSection';
import { FeatureCarousel } from '@/components/sections/FeatureCarousel';
import { SocialProofSection } from '@/components/sections/SocialProofSection';
import { ProblemSolutionSection } from '@/components/sections/ProblemSolutionSection';
import { IndustryGrid } from '@/components/sections/IndustryGrid';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { PROBLEM_SOLUTIONS } from '@/lib/constants';
import { DashboardMockup, ReportMockup, HandoffMockup } from '@/components/ui/ProductMockups';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Una Labs - AI Launchpad for Founders',
  description:
    'Una Labs is a concierge custom-project operating system for founders. Structured intake, scoped plans, governed delivery, and measurable proof from first conversation to delivered work.',
  path: '/',
});

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
