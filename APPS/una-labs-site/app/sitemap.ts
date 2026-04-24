import type { MetadataRoute } from 'next';
import { caseStudies, productPages, solutionPages } from '@/lib/site-content';

export const dynamic = 'force-static';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unalabs.cloud';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const publicRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/product', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/blog', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/demo', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/start', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/start/summary', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/start-project', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/start-project/summary', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/realtor', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/status', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ];

  const productRoutes = Object.keys(productPages).map((slug) => ({
    path: `/product/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
  }));

  const caseStudyRoutes = Object.keys(caseStudies).map((slug) => ({
    path: `/products/${slug}`,
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  }));

  const solutionRoutes = Object.keys(solutionPages).map((slug) => ({
    path: `/solutions/${slug}`,
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  }));

  return [...publicRoutes, ...productRoutes, ...caseStudyRoutes, ...solutionRoutes].map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
