import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anion Class App',
  description: 'Role-based learning platform with booking, billing, and live class sessions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const criticalEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'DAILY_API_KEY',
  ] as const;
  const missingCriticalEnvVars = criticalEnvVars.filter((key) => !process.env[key]);
  const isNonProduction =
    process.env.NODE_ENV !== 'production' ||
    (process.env.CF_PAGES_BRANCH ? process.env.CF_PAGES_BRANCH !== 'main' : false) ||
    (process.env.VERCEL_ENV ? process.env.VERCEL_ENV !== 'production' : false);
  const showReadinessNotice = isNonProduction && missingCriticalEnvVars.length > 0;

  return (
    <html lang="en">
      <body>
        <main>
          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/tutors">Tutors</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/student">Student</Link>
            <Link href="/parent">Parent</Link>
            <Link href="/tutor">Tutor</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
          {showReadinessNotice && (
            <aside className="readiness-notice" role="status">
              Operator notice (non-production): missing env vars for go-live readiness —{' '}
              {missingCriticalEnvVars.join(', ')}.
            </aside>
          )}
          {children}
          <footer className="footer-legal">
            <Link href="/privacy">Privacy</Link>
            <span aria-hidden="true">•</span>
            <Link href="/terms">Terms</Link>
          </footer>
        </main>
      </body>
    </html>
  );
}
