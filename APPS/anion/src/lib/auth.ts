import { createBrowserClient } from '@/app/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

function getClient() {
  return createBrowserClient();
}

export function authEnabled() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export async function loadSession(): Promise<Session | null> {
  if (!authEnabled()) {
    return null;
  }

  const { data } = await getClient().auth.getSession();
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

  return getClient().auth.onAuthStateChange((_event, session) => handler(session));
}

export async function sendMagicLink(email: string) {
  if (!authEnabled()) {
    throw new Error('Supabase auth is not configured for this environment.');
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;
  return getClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
}

export async function logout() {
  if (!authEnabled()) {
    return;
  }

  await getClient().auth.signOut();
}
