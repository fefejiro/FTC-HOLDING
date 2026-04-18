import type { Metadata } from 'next';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import { DemoContent } from '@/app/demo/DemoContent';

export const metadata: Metadata = {
  title: 'Demo',
  description:
    'Watch the live Una Labs product story through Loom-ready walkthroughs of intake, delivery, AI automation, and shipped products.',
};

export default function DemoPage() {
  return (
    <>
      <DemoContent />
      <FinalCTASection />
    </>
  );
}
