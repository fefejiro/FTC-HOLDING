import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'How Una Labs Works',
  description: 'See how Una Labs helps teams move from intake to delivery with confidence.',
};

export default function AteamPage() {
  return (
    <section className="bg-white">
      <div className="max-w-narrow mx-auto px-6 pt-16 pb-24 text-center">
        <Badge variant="muted">Page updated</Badge>
        <h1 className="mt-4 text-display-sm text-tx-heading">See how Una Labs delivers</h1>
        <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
          The details you are looking for now live inside the main Una Labs site. Explore how intake,
          project visibility, approvals, and delivery work together from one place.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button href="/about" variant="primary" size="lg">About Una Labs</Button>
          <Button href="/how-it-works" variant="secondary" size="lg">How it works</Button>
        </div>
      </div>
    </section>
  );
}
