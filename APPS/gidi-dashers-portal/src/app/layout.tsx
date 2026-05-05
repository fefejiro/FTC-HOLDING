import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'Gidi Dashers — Lagos Endless Runner',
  description: 'Dodge danfo, molue, LASTMA. Stack naira. Run Gidi.',
  openGraph: {
    title: 'Gidi Dashers',
    description: 'Lagos endless runner. Dodge wahala. Stack naira.',
    url: 'https://gidi-dashers.pages.dev',
    siteName: 'Gidi Dashers',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
