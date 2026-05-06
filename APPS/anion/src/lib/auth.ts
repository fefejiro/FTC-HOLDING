import type { Session } from '@supabase/supabase-js';
import { createBrowserClient } from '../../app/lib/supabase/client';

type MinimalAuthSubscription = {
  data: {
    subscription: {
      unsubscribe: () => void;
    };
  };
};

let client: ReturnType<typeof createBrowserClient> | null = null;

function getClient() {
  client ??= createBrowserClient();
  return client;
}

function hasPublicSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function authEnabled() {
  return hasPublicSupabaseEnv();
}

export async function loadSession(): Promise<Session | null> {
  if (!authEnabled()) {
    return null;
  }

  const { data, error } = await getClient().auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export function subscribeToAuth(handler: (session: Session | null) => void): MinimalAuthSubscription {
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
  return getClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
}

export async function logout() {
  if (!authEnabled()) {
    return;
  }

  await getClient().auth.signOut();
}
