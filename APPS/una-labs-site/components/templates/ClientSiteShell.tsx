'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AssistantDrawer } from '@/components/AssistantDrawer';

interface NavItem {
  label: string;
  href: string;
}

interface ClientSiteShellProps {
  clientName: string;
  primaryColor?: string;
  logoUrl?: string;
  projectId?: string;
  nav?: NavItem[];
  children: React.ReactNode;
}

const DEFAULT_NAV: NavItem[] = [
  { label: 'Portal', href: '/portal' },
  { label: 'Briefing', href: '/dashboard/briefing' },
  { label: 'Report', href: '/dashboard/report' },
  { label: 'Proposal', href: '/dashboard/proposal' },
];

type AuthState = 'loading' | 'unauthenticated' | 'ready';

export function ClientSiteShell({
  clientName,
  primaryColor = 'brand-teal',
  logoUrl,
  projectId,
  nav = DEFAULT_NAV,
  children,
}: ClientSiteShellProps) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const pathname = usePathname();
  const router = useRouter();
  const accentTextClass = primaryColor === 'brand-orange' ? 'text-brand-orange' : 'text-brand-teal';
  const accentBgClass = primaryColor === 'brand-orange' ? 'bg-brand-orange' : 'bg-brand-teal';
  const accentSoftBgClass = primaryColor === 'brand-orange' ? 'bg-brand-orange/10' : 'bg-brand-teal/10';

  useEffect(() => {
    async function checkSession() {
      try {
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();
        if (!session?.user) {
          const redirect = encodeURIComponent(pathname + (projectId ? `?id=${projectId}` : ''));
          router.push(`/login?redirect=${redirect}`);
          setAuthState('unauthenticated');
          return;
        }

        setAuthState('ready');
      } catch {
        setAuthState('unauthenticated');
      }
    }

    checkSession();
  }, [pathname, projectId, router]);

  function buildHref(href: string): string {
    if (projectId) return `${href}?id=${projectId}`;
    return href;
  }

  function isActive(href: string): boolean {
    return pathname.startsWith(href);
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${clientName} logo`}
                width={32}
                height={32}
                className="rounded"
              />
            ) : (
              <div className={`w-8 h-8 rounded ${accentBgClass} flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">
                  {clientName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-h4 text-tx-heading font-semibold">{clientName}</span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={buildHref(item.href)}
                className={`px-3 py-1.5 rounded text-body-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? `${accentSoftBgClass} ${accentTextClass}`
                    : 'text-tx-secondary hover:text-tx-heading hover:bg-bg-subtle'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Una Labs wordmark */}
          <Link
            href="/"
            className="text-body-sm text-tx-muted hover:text-tx-secondary transition-colors"
          >
            Powered by <span className="font-medium text-tx-secondary">Una Labs</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-6 mt-12 print:hidden">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-body-sm text-tx-muted">
          <span>
            {clientName} - managed by{' '}
            <a href="/" className="hover:text-tx-secondary transition-colors font-medium">
              Una Labs
            </a>
          </span>
          <span>(c) {new Date().getFullYear()} Una Labs. All rights reserved.</span>
        </div>
      </footer>

      {/* AI Assistant — always present */}
      <AssistantDrawer />
    </div>
  );
}
