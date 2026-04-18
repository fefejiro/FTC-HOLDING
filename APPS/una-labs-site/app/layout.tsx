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

export const metadata: Metadata = {
  title: {
    template: '%s | Una Labs',
    default: 'Una Labs — The Professional Service Platform',
  },
  description:
    'Structured intake, clear proposals, governed delivery, and measurable proof. The platform built for teams who deliver with confidence.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unalabs.cloud'),
  openGraph: {
    type: 'website',
    siteName: 'Una Labs',
    title: 'Una Labs — The Professional Service Platform',
    description:
      'Structured intake, clear proposals, governed delivery, and measurable proof.',
    images: [{ url: '/images/og/default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Una Labs — The Professional Service Platform',
    description:
      'Structured intake, clear proposals, governed delivery, and measurable proof.',
    images: ['/images/og/default.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
