'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  isGardenCleanersCustomHost,
  isGardenCleanersPublicPath,
  stripGardenCleanersBasePath,
} from '../../lib/gardenCleaners';
import {
  isOgTradesCustomHost,
  isOgTradesPublicPath,
  stripOgTradesBasePath,
} from '../../lib/ogTradesAcademy';
import { PRODUCT_AUTH_CONFIG } from '../../lib/productAuth';

/**
 * Root-level brand isolation router for ftc-site.
 *
 * This component ensures that branded custom domains (gardencleaners.ca, ogtradesacademy.com, etc.)
 * ALWAYS redirect to their own branded routes or homepages, preventing any content from
 * a different brand from rendering on a branded domain.
 *
 * Why it's needed:
 * - ftc-site serves multiple brands from a shared codebase
 * - Cloudflare Pages can bind multiple domains to the same project output
 * - If `_redirects` fails to apply (rare but possible), content from one brand could bleed to another
 * - This client-side guard ensures brand fidelity even if infrastructure redirects fail
 *
 * How it works:
 * 1. On mount, checks `window.location.host`
 * 2. If host matches a branded custom domain (e.g., gardencleaners.ca):
 *    - If current route is already branded (e.g., /garden-cleaners/*), allow render
 *    - Otherwise, redirect to the brand's root route (e.g., /garden-cleaners)
 * 3. If host is unalabs.cloud, allow Una Labs content to render (default brand)
 * 4. This prevents flicker of wrong brand while redirect happens
 *
 * Important: This is a SAFETY NET, not the primary redirect mechanism.
 * Primary redirects should happen in `public/_redirects` (Cloudflare Pages).
 * This component catches edge cases where infrastructure redirects don't apply.
 *
 * For developers:
 * - Add new branded routes in APPS/ftc-site/app/[brand]-[name]/ directory
 * - Register the custom host in the corresponding lib/[brand].ts file
 * - Update isXxxCustomHost() and the branded path helpers
 * - RootBrandRouter will automatically apply to all new branded routes
 */
export default function RootBrandRouter({ children }: { children: ReactNode }) {
  const [shouldRender, setShouldRender] = useState(false);
  const unaThemeClass = PRODUCT_AUTH_CONFIG.una.themeBodyClass;
  const gardenThemeClass = PRODUCT_AUTH_CONFIG.garden.themeBodyClass;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const host = window.location.host.toLowerCase();
    const pathname = window.location.pathname;
    const isGardenRoute = pathname === '/garden-cleaners' || pathname.startsWith('/garden-cleaners/');
    const isOgTradesRoute = pathname === '/og-trades-academy' || pathname.startsWith('/og-trades-academy/');

    document.body.classList.remove(unaThemeClass, gardenThemeClass, 'brand-og-trades');

    if (isGardenCleanersCustomHost(host) || isGardenRoute) {
      document.body.classList.add(gardenThemeClass);

      // Strict routing checks only apply on the custom domain.
      if (isGardenCleanersCustomHost(host)) {
      const stripped = stripGardenCleanersBasePath(pathname);

      // If an internal prefixed path appears on the custom domain,
      // normalize to the clean branded route (/about, /services, etc.).
      if (stripped && isGardenCleanersPublicPath(stripped)) {
        window.location.replace(stripped);
        return;
      }

      if (!isGardenCleanersPublicPath(pathname)) {
        window.location.replace('/');
        return;
      }
      }
    }

    if (isOgTradesCustomHost(host) || isOgTradesRoute) {
      document.body.classList.add('brand-og-trades');

      // Strict routing checks only apply on the custom domain.
      if (isOgTradesCustomHost(host)) {
      const stripped = stripOgTradesBasePath(pathname);

      // If an internal prefixed path appears on the custom domain,
      // normalize to the clean branded route (/about, /course, etc.).
      if (stripped && isOgTradesPublicPath(stripped)) {
        window.location.replace(stripped);
        return;
      }

      if (!isOgTradesPublicPath(pathname)) {
        window.location.replace('/');
        return;
      }
      }
    }

    if (!(isGardenCleanersCustomHost(host) || isGardenRoute) && !(isOgTradesCustomHost(host) || isOgTradesRoute)) {
      document.body.classList.add(unaThemeClass);
    }

    // All other hosts (including unalabs.cloud): allow render
    setShouldRender(true);
  }, []);

  // Don't render anything until we've confirmed the host/route alignment
  // This prevents a brief flash of the wrong brand
  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
}
