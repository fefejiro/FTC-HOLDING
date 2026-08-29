import type { Metadata } from 'next';
import { LivingHeroSection } from '@/components/sections/LivingHeroSection';
import { FeatureCarousel } from '@/components/sections/FeatureCarousel';
import { TrySystemSection } from '@/components/sections/TrySystemSection';
import { ShippedProductsSection } from '@/components/sections/ShippedProductsSection';
import { HowWeWorkSection } from '@/components/sections/HowWeWorkSection';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Una Labs — FTC Product Lab',
  description:
    'Una Labs is FTC\'s product lab. We help turn unclear problems into useful digital products through clarity, delivery, and thoughtful improvement.',
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
