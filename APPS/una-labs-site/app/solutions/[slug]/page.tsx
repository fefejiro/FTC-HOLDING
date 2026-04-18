import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CapabilityPage } from '@/components/templates/CapabilityPage';
import { solutionPages } from '@/lib/site-content';

type Params = {
  slug: string;
};

type PageProps = {
  params: Promise<Params>;
};

export function generateStaticParams(): Params[] {
  return Object.keys(solutionPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = solutionPages[slug];
  if (!page) {
    return {};
  }

  return {
    title: page.metaTitle,
    description: page.metaDescription,
  };
}

export default async function SolutionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const page = solutionPages[slug];
  if (!page) {
    notFound();
  }

  return <CapabilityPage page={page} />;
}
