import { createClient, SupabaseClient as BaseClient } from '@supabase/supabase-js';

// placeholder for db type
export type Database = any;

export type SupabaseClient = BaseClient<Database>;

export function createBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_URL is required for @ftc/supabase');
  if (!key) throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY is required for @ftc/supabase');
  return createClient<Database>(url, key);
}

export function createServerClient(cookies?: string | { [k: string]: string }): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_URL is required for @ftc/supabase');
  if (!key) throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY is required for @ftc/supabase');
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