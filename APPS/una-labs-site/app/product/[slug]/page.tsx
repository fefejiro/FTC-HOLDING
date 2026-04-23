import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CapabilityPage } from '@/components/templates/CapabilityPage';
import { productPages } from '@/lib/site-content';
import { buildPageMetadata } from '@/lib/metadata';

type Params = {
  slug: string;
};

type PageProps = {
  params: Promise<Params>;
};

export function generateStaticParams(): Params[] {
  return Object.keys(productPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = productPages[slug];
  if (!page) {
    return {};
  }

  return buildPageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/product/${slug}`,
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const page = productPages[slug];
  if (!page) {
    notFound();
  }

  return <CapabilityPage page={page} />;
}
