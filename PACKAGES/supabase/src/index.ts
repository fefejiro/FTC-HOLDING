import { createClient, SupabaseClient as BaseClient } from '@supabase/supabase-js';

// placeholder for db type
export type Database = any;

export type SupabaseClient = BaseClient<Database>;

type PublicSupabaseEnv = {
  url: string;
  key: string;
};

function getProcessEnv(): Record<string, string | undefined> {
  if (typeof process === 'undefined' || !process.env) {
    return {};
  }

  return process.env as Record<string, string | undefined>;
}

function getImportMetaEnv(): Record<string, string | undefined> {
  return ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {});
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const processEnv = getProcessEnv();
  const importMetaEnv = getImportMetaEnv();

  const url =
    importMetaEnv.VITE_SUPABASE_URL ||
    processEnv.VITE_SUPABASE_URL ||
    importMetaEnv.NEXT_PUBLIC_SUPABASE_URL ||
    processEnv.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    importMetaEnv.VITE_SUPABASE_ANON_KEY ||
    processEnv.VITE_SUPABASE_ANON_KEY ||
    importMetaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      'Public Supabase URL is required. Set VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.'
    );
  }

  if (!key) {
    throw new Error(
      'Public Supabase anon key is required. Set VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return { url, key };
}

export function hasPublicSupabaseEnv(): boolean {
  try {
    getPublicSupabaseEnv();
    return true;
  } catch {
    return false;
  }
}

export function createBrowserClient(): SupabaseClient {
  const { url, key } = getPublicSupabaseEnv();
  return createClient<Database>(url, key);
}

export function createServerClient(cookies?: string | { [k: string]: string }): SupabaseClient {
  const { url, key } = getPublicSupabaseEnv();
  const opts: any = { auth: { persistSession: false } };
  if (cookies) {
    opts.headers = { cookie: typeof cookies === 'string' ? cookies : Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join('; ') };
  }
  return createClient<Database>(url, key, opts);
}

export default {
  getPublicSupabaseEnv,
  hasPublicSupabaseEnv,
  createBrowserClient,
  createServerClient,
};