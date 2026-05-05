'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FOOTER_LINKS } from '@/lib/constants';
import { getStripeApiUrl } from '@/lib/stripe-config';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subState, setSubState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setSubState('loading');
    try {
      const res = await fetch(getStripeApiUrl('/api/subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubState(res.ok ? 'done' : 'error');
    } catch {
      setSubState('error');
    }
  };

  return (
    <footer className="bg-bg-subtle border-t border-border">
      <div className="max-w-content mx-auto px-6 py-16">

        {/* Newsletter */}
        <div className="mb-12 pb-12 border-b border-border max-w-md">
          <h3 className="text-h4 text-tx-heading mb-2">Stay in the loop</h3>
          <p className="text-body-sm text-tx-secondary mb-4">
            Product updates, delivery insights, and professional service tips.
          </p>
          {subState === 'done' ? (
            <p className="text-body-sm text-brand-teal font-medium">You're subscribed. We'll be in touch.</p>
          ) : (
            <form className="flex gap-3" onSubmit={handleSubscribe}>
              <label htmlFor="footer-email" className="sr-only">Email address</label>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="flex-1 px-4 py-2 text-body border border-border rounded-lg focus:outline-none focus:border-border-focus"
              />
              <button
                type="submit"
                disabled={subState === 'loading'}
                className="px-5 py-2 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {subState === 'loading' ? '…' : 'Subscribe'}
              </button>
            </form>
          )}
          {subState === 'error' && (
            <p className="text-body-sm text-red-500 mt-2">Something went wrong. Try again.</p>
          )}
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {FOOTER_LINKS.map((col) => (
            <div key={col.heading}>
              <p className="text-eyebrow uppercase text-tx-muted tracking-widest mb-4">
                {col.heading}
              </p>
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-tx-secondary hover:text-brand-teal transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-border">
          <p className="text-caption text-tx-muted">
            © {new Date().getFullYear()} Una Labs. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-caption text-tx-muted hover:text-tx-secondary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-caption text-tx-muted hover:text-tx-secondary transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-caption text-tx-muted hover:text-tx-secondary transition-colors">
              Contact
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
