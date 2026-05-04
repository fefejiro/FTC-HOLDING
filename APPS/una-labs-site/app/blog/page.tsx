import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildPageMetadata } from '@/lib/metadata';
import { blogPosts } from '@/lib/blog-posts';

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
          <h1 className="mt-4 text-display text-tx-heading">Delivery thinking from the Una Labs build process</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            Product notes, delivery-system thinking, and build stories from the real Una Labs ecosystem.
          </p>
        </div>

        <div className="mt-12 grid gap-6 max-w-3xl">
          {blogPosts.map((post) => {
            const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            return (
              <article
                key={post.slug}
                className="rounded-[28px] border border-border bg-bg-offwhite p-8 shadow-sm"
              >
                <p className="text-body-sm text-tx-muted">
                  <time dateTime={post.date}>{formattedDate}</time>
                </p>
                <h2 className="mt-3 text-h3 text-tx-heading">
                  <Link href={`/blog/${post.slug}`} className="hover:text-brand-teal transition-colors">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-body leading-relaxed text-tx-secondary">{post.description}</p>
                <div className="mt-6">
                  <Button href={`/blog/${post.slug}`} variant="ghost" size="md">
                    Read article →
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 max-w-3xl flex flex-wrap gap-4">
          <Button href="/demo" variant="secondary" size="lg">
            Watch the demos
          </Button>
          <Button href="/products/dispatch" variant="ghost" size="lg">
            Explore case studies →
          </Button>
        </div>
      </div>
    </section>
  );
}
