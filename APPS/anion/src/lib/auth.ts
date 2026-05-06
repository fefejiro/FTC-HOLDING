import { getSession, onAuthStateChange, signInWithOtpEmail, signOut } from '@ftc/auth';
import { hasPublicSupabaseEnv } from '@ftc/supabase';
import type { Session } from '@supabase/supabase-js';

export function authEnabled() {
  return hasPublicSupabaseEnv();
}

export async function loadSession(): Promise<Session | null> {
  if (!authEnabled()) {
    return null;
  }

  return getSession();
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

  return onAuthStateChange((_event, session) => handler(session));
}

export async function sendMagicLink(email: string) {
  if (!authEnabled()) {
    throw new Error('Supabase auth is not configured for this environment.');
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;
  return signInWithOtpEmail(email, redirectTo);
}

export async function logout() {
  if (!authEnabled()) {
    return;
  }

  await signOut();
}
