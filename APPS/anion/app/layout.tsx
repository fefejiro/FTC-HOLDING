import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import SwRegister from './components/SwRegister';
import { getCurrentUser } from './lib/auth/getCurrentUser';

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Anion',
  description: 'Class scheduling, billing, and live sessions in one flow.',
  applicationName: 'Anion',
  appleWebApp: {
    capable: true,
    title: 'Anion',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'Anion',
    description: 'Class scheduling, billing, and live sessions in one flow.',
    type: 'website',
  },
  manifest: '/manifest.webmanifest',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <SwRegister />
        <main>
          <nav className="nav">
            <Link href="/">Anion</Link>
            <Link href="/tutors">Tutors</Link>
            <Link href="/pricing">Pricing</Link>
            {user ? <Link href="/dashboard">Dashboard</Link> : <Link href="/login">Login</Link>}
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
