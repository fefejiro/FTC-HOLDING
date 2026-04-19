import type { Metadata } from 'next';
import { HeroSection } from '@/components/sections/HeroSection';
import { FeatureCarousel } from '@/components/sections/FeatureCarousel';
import { SocialProofSection } from '@/components/sections/SocialProofSection';
import { ProblemSolutionSection } from '@/components/sections/ProblemSolutionSection';
import { IndustryGrid } from '@/components/sections/IndustryGrid';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { PROBLEM_SOLUTIONS } from '@/lib/constants';
import { DashboardMockup, ReportMockup, HandoffMockup } from '@/components/ui/ProductMockups';

export const metadata: Metadata = {
  title: 'Una Labs - The Professional Service Platform',
  description:
    'Structured intake, clear proposals, governed delivery, and measurable proof. The platform built for teams who deliver with confidence.',
};

const IMAGE_POSITIONS = ['right', 'left', 'right'] as const;
const BACKGROUNDS = ['white', 'subtle', 'white'] as const;
const MOCKUPS = [DashboardMockup, ReportMockup, HandoffMockup] as const;

export default function HomePage() {
  return (
    <>
      <HeroSection
        eyebrow="Una Labs"
        headline="From client request to delivered project, with proof."
        accentPhrase="with proof."
        subheadline="Una Labs structures your intake, scopes the work, and gives every project a live client workspace. Your clients can see exactly where things stand and approve each milestone themselves."
        ctaPrimaryLabel="Start Free Trial"
        ctaPrimaryHref="/start"
        ctaSecondaryLabel="Watch a Demo"
        ctaSecondaryHref="/demo"
        frictionNote="14-day free trial. No credit card required."
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
