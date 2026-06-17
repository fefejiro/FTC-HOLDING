import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import PublicRuntimeConfig from './components/PublicRuntimeConfig';
import SwRegister from './components/SwRegister';
import CookieConsentBanner from './components/CookieConsentBanner';
import SignOutButton from './components/SignOutButton';
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
        <PublicRuntimeConfig />
        <SwRegister />
        <header style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--brand-teal)', textDecoration: 'none' }}>Anion</Link>
            <nav className="nav" style={{ margin: '0', padding: '0', border: 'none', borderBottom: 'none' }}>
              <Link href="/tutors" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', textDecoration: 'none' }}>Find Tutors</Link>
              <Link href="/pricing" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', textDecoration: 'none' }}>Pricing</Link>
              {user ? (
                <>
                  <Link href="/dashboard" style={{ fontSize: '14px', fontWeight: '600', color: 'white', backgroundColor: 'var(--brand-teal)', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none' }}>Dashboard</Link>
                  <SignOutButton />
                </>
              ) : (
                <Link href="/login" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--brand-teal)', textDecoration: 'none' }}>Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main>
          {children}
        </main>
        <CookieConsentBanner />
        <footer style={{ borderTop: '1px solid #e2e8f0', backgroundColor: 'white', marginTop: '24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Anion platform status: production handoff in progress.</p>
            <nav style={{ display: 'flex', gap: '12px', alignItems: 'center' }} aria-label="Legal links">
              <Link href="/privacy" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy</Link>
              <Link href="/terms" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
