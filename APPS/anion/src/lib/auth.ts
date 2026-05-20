// Auth helpers for client components.
// Uses the Anion-local Supabase browser client so this file has no dependency
// on the cross-workspace @ftc/auth or @ftc/supabase packages.
import { createBrowserClient } from '@/app/lib/supabase/client';

export type AuthUser = {
  id: string;
  email?: string | null;
  [key: string]: unknown;
};

export type AuthSession = {
  user: AuthUser | null;
  [key: string]: unknown;
};

export function authEnabled() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function loadSession(): Promise<AuthSession | null> {
  if (!authEnabled()) {
    return null;
  }

  const { data } = await createBrowserClient().auth.getSession();
  return data.session;
}

export function subscribeToAuth(handler: (session: AuthSession | null) => void) {
  if (!authEnabled()) {
    return {
      data: {
        subscription: {
          unsubscribe() {},
        },
      },
    };
  }

  return createBrowserClient().auth.onAuthStateChange((_event: unknown, session: AuthSession | null) => handler(session));
}


export async function signInWithGoogle() {
  if (!authEnabled()) {
    throw new Error('Supabase auth is not configured for this environment.');
  }
  const redirectTo = typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined;
  return createBrowserClient().auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  });
}

export async function logout() {
  if (!authEnabled()) {
    return;
  }

  await createBrowserClient().auth.signOut();
}

