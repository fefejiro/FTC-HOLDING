import { createBrowserClient } from '@ftc/supabase';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase(): ReturnType<typeof createBrowserClient> {
  if (!_client) {
    if (typeof window === 'undefined') {
      throw new Error('getSupabase() called on server; use createServerClient instead');
    }
    _client = createBrowserClient();
  }
  return _client;
}

export default getSupabase;
