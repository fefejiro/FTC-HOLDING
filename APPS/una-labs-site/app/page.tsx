import type { Metadata } from 'next';
import { LivingHeroSection } from '@/components/sections/LivingHeroSection';
import { FeatureCarousel } from '@/components/sections/FeatureCarousel';
import { TrySystemSection } from '@/components/sections/TrySystemSection';
import { ShippedProductsSection } from '@/components/sections/ShippedProductsSection';
import { HowWeWorkSection } from '@/components/sections/HowWeWorkSection';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Una Labs - AI Launchpad for Founders',
  description:
    'Una Labs is a concierge custom-project operating system for founders. Structured intake, scoped plans, governed delivery, and measurable proof from first conversation to delivered work.',
  path: '/',
});

export default function HomePage() {
  return (
    <>
      <LivingHeroSection />
      <FeatureCarousel />
      <TrySystemSection />
      <ShippedProductsSection />
      <HowWeWorkSection />
      <FinalCTASection />
    </>
  );
}
