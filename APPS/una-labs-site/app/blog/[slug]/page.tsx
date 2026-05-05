import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { blogPosts, getBlogPost } from '@/lib/blog-posts';
import { buildPageMetadata } from '@/lib/metadata';

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Post Not Found | Una Labs' };
  return buildPageMetadata({
    title: `${post.title} — Una Labs`,
    description: post.description,
    path: `/blog/${post.slug}`,
  });
}

function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="mt-4 space-y-2 pl-5 list-disc text-body-lg text-tx-body">
        {listBuffer.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>,
    );
    listBuffer = [];
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="mt-10 mb-4 text-h2 text-tx-heading">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
      // skip blank lines (spacing handled by surrounding elements)
    } else {
      flushList();
      elements.push(
        <p key={key++} className="mt-4 text-body-lg leading-relaxed text-tx-body">
          {line}
        </p>,
      );
    }
  }

  flushList();
  return elements;
}

export default async function BlogSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-content mx-auto px-6 pt-16 pb-24">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-body-sm text-tx-muted">
          <Link href="/blog" className="hover:text-brand-teal transition-colors">
            Journal
          </Link>
          <span>/</span>
          <span className="text-tx-secondary line-clamp-1">{post.title}</span>
        </div>

        <article className="max-w-3xl">
          <Badge variant="teal">Journal</Badge>
          <h1 className="mt-4 text-display text-tx-heading">{post.title}</h1>
          <p className="mt-3 text-body-sm text-tx-muted">
            <time dateTime={post.date}>{formattedDate}</time>
          </p>
          <p className="mt-6 text-body-lg font-medium leading-relaxed text-tx-secondary">
            {post.description}
          </p>

          <div className="mt-10 border-t border-border" />

          <div className="mt-10">{renderContent(post.content)}</div>
        </article>

        <div className="mt-16 max-w-3xl rounded-[28px] border border-border bg-bg-offwhite p-8 shadow-sm">
          <p className="text-body font-semibold text-tx-heading">Ready to build something real?</p>
          <p className="mt-2 text-body-sm text-tx-secondary">
            Una Labs ships live products, not slide decks. Start a project or watch the demos to see the systems in action.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Button href="/start" variant="primary" size="lg">
              Start your project
            </Button>
            <Button href="/demo" variant="secondary" size="lg">
              Watch the demos
            </Button>
          </div>
        </div>

        <div className="mt-10 max-w-3xl">
          <Button href="/blog" variant="ghost" size="md">
            ← Back to journal
          </Button>
        </div>
      </div>
    </main>
  );
}
