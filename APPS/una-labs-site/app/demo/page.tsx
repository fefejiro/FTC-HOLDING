import type { Metadata } from 'next';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { DemoContent } from '@/app/demo/DemoContent';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Demo — Una Labs',
  description:
    'Watch the live Una Labs product story through Loom-ready walkthroughs of intake, delivery, AI automation, and shipped products.',
  path: '/demo',
});

export default function DemoPage() {
  return (
    <>
      <DemoContent />
      <FinalCTASection />
    </>
  );
}
