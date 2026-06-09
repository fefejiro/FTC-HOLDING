import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getRuntimeSupabaseAnonKey, getRuntimeSupabaseUrl } from '../runtime-env';

export async function createServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getRuntimeSupabaseUrl();
  const supabaseAnonKey = getRuntimeSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public runtime configuration.');
  }

  return createSSRServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // Middleware handles session refresh.
          }
        },
      },
    },
  );
}
