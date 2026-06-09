'use client';

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';

type AnionPublicConfig = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

type GlobalWithAnionConfig = typeof globalThis & {
  __ANION_PUBLIC_CONFIG__?: AnionPublicConfig;
};

export function getPublicConfig(): AnionPublicConfig | null {
  const runtimeConfig = (globalThis as GlobalWithAnionConfig).__ANION_PUBLIC_CONFIG__;

  if (runtimeConfig?.NEXT_PUBLIC_SUPABASE_URL && runtimeConfig?.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return runtimeConfig;
  }

  return null;
}

export function createBrowserClient() {
  const config = getPublicConfig();

  if (!config) {
    throw new Error('Missing public Supabase configuration.');
  }

  return createSSRBrowserClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
