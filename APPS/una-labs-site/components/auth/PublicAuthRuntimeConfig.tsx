'use client';

import { useEffect } from 'react';
import { ensurePublicAuthRuntimeConfig } from '@/lib/public-auth-runtime';

/** Preloads auth configuration without blocking normal public-page navigation. */
export function PublicAuthRuntimeConfig() {
  useEffect(() => {
    void ensurePublicAuthRuntimeConfig().catch(() => {
      // Login surfaces present a clear retry message when the visitor requests authentication.
    });
  }, []);

  return null;
}
