import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unalabs.cloud';

const defaultTitle = 'Una Labs — AI Launchpad for Founders';
const defaultDescription =
  'Una Labs is an AI-powered professional service platform for founders. Structured intake, clear proposals, governed delivery, and measurable proof — from client request to delivered project.';

export const metadata: Metadata = {
  title: {
    template: '%s | Una Labs — AI Launchpad for Founders',
    default: defaultTitle,
  },
  description: defaultDescription,
  metadataBase: new URL(SITE_URL),
  keywords: [
    'Una Labs',
    'AI Launchpad for Founders',
    'professional service platform',
    'AI project delivery',
    'client intake automation',
    'milestone tracking',
    'proposal generator',
    'AI scoping',
    'founder tools',
    'service business software',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: './',
  },
  openGraph: {
    type: 'website',
    siteName: 'Una Labs',
    title: defaultTitle,
    description: defaultDescription,
    url: SITE_URL,
    images: [{ url: '/images/og/default.png', width: 1200, height: 630, alt: 'Una Labs — AI Launchpad for Founders' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/images/og/default.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Una Labs',
  url: SITE_URL,
  logo: `${SITE_URL}/images/og/default.png`,
  description: defaultDescription,
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'mike.fejiro@gmail.com',
      areaServed: 'CA',
      availableLanguage: ['en'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
