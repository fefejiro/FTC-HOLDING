import { createClient, SupabaseClient as BaseClient } from '@supabase/supabase-js';

// placeholder for db type
export type Database = any;

export type SupabaseClient = BaseClient<Database>;

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Environment variable ${name} is required for @ftc/supabase`);
  }
  return val;
}

export function createBrowserClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient<Database>(url, key);
}

/**
 * Optionally pass cookies string or object (Next.js server) to persist auth.
 */
export function createServerClient(cookies?: string | { [k: string]: string }): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const opts: any = { auth: { persistSession: false } };
  if (cookies) {
    opts.headers = { cookie: typeof cookies === 'string' ? cookies : Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join('; ') };
  }
  return createClient<Database>(url, key, opts);
}

export default {
  createBrowserClient,
  createServerClient,
};