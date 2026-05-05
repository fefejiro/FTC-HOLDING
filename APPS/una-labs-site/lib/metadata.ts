import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unalabs.cloud';

function normalizePath(path: string): string {
  if (!path || path === '/') {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

function absoluteUrl(path: string): string {
  return `${SITE_URL}${normalizePath(path)}`;
}

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
};

export function buildPageMetadata({
  title,
  description,
  path,
  image = '/opengraph-image',
  type = 'website',
}: MetadataInput): Metadata {
  const canonicalPath = normalizePath(path);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type,
      siteName: 'Una Labs',
      title,
      description,
      url: absoluteUrl(canonicalPath),
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
