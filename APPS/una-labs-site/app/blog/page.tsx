import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Blog — Una Labs',
  description:
    'The Una Labs journal for delivery systems, product operations, AI workflow, and shipped product notes.',
  path: '/blog',
});

export default function BlogPage() {
  return (
    <section className="bg-white">
      <div className="max-w-content mx-auto px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          <Badge variant="teal">Journal</Badge>
          <h1 className="mt-4 text-display text-tx-heading">Una Labs Journal</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            Product notes, delivery-system thinking, and build stories from the real Una Labs ecosystem.
            Posts coming soon.
          </p>
        </div>
      </div>
    </section>
  );
}
