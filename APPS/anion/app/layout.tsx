import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anion Class App',
  description: 'Role-based learning platform with booking, billing, and live class sessions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
