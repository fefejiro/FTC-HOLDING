'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { isGardenCleanersCustomHost } from '../../lib/gardenCleaners';
import { isOgTradesCustomHost } from '../../lib/ogTradesAcademy';

/**
 * Defensive client-side host redirect for the root route.
 *
 * Production redirects in `public/_redirects` are supposed to map
 * `https://gardencleaners.ca/` -> `/garden-cleaners` and the OG Trades hosts
 * to their own home, but those rules are not always honored when the same
 * Pages output is bound to multiple Cloudflare Pages projects. This wrapper
 * guarantees that branded hosts can NEVER render the Una Labs marketing
 * homepage even if `_redirects` fails to apply.
 */
export default function HomeHostRouter({ children }: { children: ReactNode }) {
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.host.toLowerCase();
    if (isGardenCleanersCustomHost(host)) {
      setShouldRedirect(true);
      window.location.replace('/garden-cleaners');
      return;
    }
    if (isOgTradesCustomHost(host)) {
      setShouldRedirect(true);
      window.location.replace('/og-trades-academy');
      return;
    }
  }, []);

  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
}
