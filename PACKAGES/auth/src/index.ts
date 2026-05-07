
import { createBrowserClient, SupabaseClient } from '@ftc/supabase';
import type { Session, User } from '@supabase/supabase-js';

function getClient(): SupabaseClient {
  return createBrowserClient();
}

/**
 * Normalize an email address (lowercase, trim).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Build a redirect URL for auth flows, using origin or window.location.origin.
 */
export function authRedirectTo(path: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return path;
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}

/**
 * Send a password reset email for the given address.
 */
export async function resetPasswordForEmail(email: string, redirectTo?: string) {
  const client = getClient();
  return client.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
}

/**
 * Update the current user's password.
 */
export async function updatePassword(newPassword: string) {
  const client = getClient();
  return client.auth.updateUser({ password: newPassword });
}

/**
 * Get the current user (if any).
 */
export async function getUser(): Promise<User | null> {
  const client = getClient();
  const { data } = await client.auth.getUser();
  return data.user || null;
}

/**
 * Returns true if the role is an admin role (owner_admin, admin, una_labs_super_admin).
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return [
    'owner_admin',
    'admin',
    'una_labs_super_admin',
  ].includes(role);
}

export async function signInWithOtpEmail(email: string, redirectTo?: string) {
  const client = getClient();
  return client.auth.signInWithOtp({
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });
}

export async function signInWithPassword(email: string, password: string) {
  const client = getClient();
  return client.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle(redirectTo?: string) {
  const client = getClient();
  return client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      ...(redirectTo ? { redirectTo } : {}),
      queryParams: { prompt: 'select_account' },
    },
  });
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
  signInWithGoogle,
  signOut,
  getSession,
  onAuthStateChange,
  requireUser,
  isAuthed,
  normalizeEmail,
  authRedirectTo,
  resetPasswordForEmail,
  updatePassword,
  getUser,
  isAdminRole,
};