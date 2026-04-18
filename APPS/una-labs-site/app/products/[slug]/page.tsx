import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CaseStudyPage } from '@/components/templates/CaseStudyPage';
import { caseStudies } from '@/lib/site-content';

type Params = {
  slug: string;
};

type PageProps = {
  params: Promise<Params>;
};

export function generateStaticParams(): Params[] {
  return Object.keys(caseStudies).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudies[slug];
  if (!study) {
    return {};
  }

  return {
    title: study.metaTitle,
    description: study.metaDescription,
  };
}

export default async function CaseStudyRoutePage({ params }: PageProps) {
  const { slug } = await params;
  const study = caseStudies[slug];
  if (!study) {
    notFound();
  }

  return <CaseStudyPage study={study} />;
}
