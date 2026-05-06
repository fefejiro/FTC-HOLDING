// Auth helpers for client components.
// Uses the Anion-local Supabase browser client so this file has no dependency
// on the cross-workspace @ftc/auth or @ftc/supabase packages.
import { createBrowserClient } from '@/app/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

export function authEnabled() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function loadSession(): Promise<Session | null> {
  if (!authEnabled()) {
    return null;
  }

  const { data } = await createBrowserClient().auth.getSession();
  return data.session;
}

export function subscribeToAuth(handler: (session: Session | null) => void) {
  if (!authEnabled()) {
    return {
      data: {
        subscription: {
          unsubscribe() {},
        },
      },
    };
  }

  return createBrowserClient().auth.onAuthStateChange((_event, session) => handler(session));
}

export async function sendMagicLink(email: string) {
  if (!authEnabled()) {
    throw new Error('Supabase auth is not configured for this environment.');
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;

  return createBrowserClient().auth.signInWithOtp({
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });
}

export async function logout() {
  if (!authEnabled()) {
    return;
  }

  await createBrowserClient().auth.signOut();
}

