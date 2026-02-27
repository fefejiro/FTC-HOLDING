import { createBrowserClient, SupabaseClient } from '@ftc/supabase';
import type { Session } from '@supabase/supabase-js';

function getClient(): SupabaseClient {
  return createBrowserClient();
}

export async function signInWithOtpEmail(email: string) {
  const client = getClient();
  return client.auth.signInWithOtp({ email });
}

export async function signInWithPassword(email: string, password: string) {
  const client = getClient();
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const client = getClient();
  return client.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const client = getClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

export function onAuthStateChange(handler: (event: string, session: Session | null) => void) {
  const client = getClient();
  return client.auth.onAuthStateChange(handler);
}

export function requireUser(session: Session | null) {
  if (!session?.user) {
    throw new Error('User is required but none found');
  }
  return session.user;
}

export function isAuthed(session: Session | null): boolean {
  return !!session?.user;
}

export default {
  signInWithOtpEmail,
  signInWithPassword,
  signOut,
  getSession,
  onAuthStateChange,
  requireUser,
  isAuthed,
};