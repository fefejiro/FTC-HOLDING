'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { NAV } from '@/lib/constants';

interface NavChild {
  label: string;
  href: string;
  description?: string;
}
interface NavDropdownItem {
  label: string;
  children: NavChild[];
  href?: never;
}
interface NavLinkItem {
  label: string;
  href: string;
  children?: never;
}
type NavItem = NavDropdownItem | NavLinkItem;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close everything on navigation
  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!activeDropdown) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeDropdown]);

  const toggleDropdown = (label: string) => {
    setActiveDropdown((prev) => (prev === label ? null : label));
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-200${
        scrolled ? ' shadow-sm border-b border-border' : ''
      }`}
    >
      <div
        ref={navRef}
        className="max-w-content mx-auto px-6 flex items-center justify-between h-16"
      >
        {/* Logo */}
        <Link
          href="/"
          className="font-display font-bold text-tx-heading text-h4 hover:text-brand-teal transition-colors"
        >
          Una Labs
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {NAV.main.map((item: NavItem) =>
            'children' in item && item.children ? (
              <div key={item.label} className="relative">
                <button
                  className="px-4 py-2 text-body text-tx-body hover:text-tx-heading rounded-md hover:bg-bg-subtle transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                  onClick={() => toggleDropdown(item.label)}
                  aria-expanded={activeDropdown === item.label}
                  aria-haspopup="true"
                >
                  {item.label}
                  <span
                    className={`text-[10px] transition-transform duration-150 ${
                      activeDropdown === item.label ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>

                {activeDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-border rounded-lg shadow-lg p-2 z-50">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-3 rounded-md hover:bg-bg-subtle transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="block text-body font-medium text-tx-heading">
                          {child.label}
                        </span>
                        {child.description && (
                          <span className="block text-body-sm text-tx-secondary mt-0.5">
                            {child.description}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-body text-tx-body hover:text-tx-heading rounded-md hover:bg-bg-subtle transition-colors"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/login"
            className="text-body text-tx-secondary hover:text-tx-heading transition-colors"
          >
            Login
          </Link>
          <Button href="/start-project" variant="primary" size="sm">
            Start Your Project
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 text-tx-body rounded-md hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-label="Mobile navigation"
          aria-modal="true"
          className="lg:hidden border-t border-border bg-white"
        >
          <div className="px-6 py-4 flex flex-col gap-1">
            {NAV.main.map((item: NavItem) => (
              <div key={item.label}>
                {'children' in item && item.children ? (
                  <>
                    <p className="px-3 pt-4 pb-1 text-eyebrow uppercase text-tx-muted tracking-widest">
                      {item.label}
                    </p>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2 text-body text-tx-body hover:text-tx-heading hover:bg-bg-subtle rounded-md transition-colors"
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="block px-3 py-2 text-body text-tx-body hover:text-tx-heading hover:bg-bg-subtle rounded-md transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}

            <div className="pt-4 mt-2 border-t border-border flex flex-col gap-3">
              <Button href="/start-project" variant="primary" size="md" className="w-full justify-center">
                Start Your Project
              </Button>
              <Link
                href="/login"
                className="text-center text-body text-tx-secondary hover:text-tx-heading transition-colors py-2"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
