import { createBrowserClient, SupabaseClient } from '@ftc/supabase';
import type { AuthSession, AuthUser } from '@supabase/supabase-js';

function getClient(): SupabaseClient {
  return createBrowserClient();
}

function getAuthClient() {
  return getClient().auth as any;
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
  const runtime = globalThis as typeof globalThis & {
    location?: { origin?: string };
  };
  const base = origin || runtime.location?.origin || '';
  if (!base) return path;
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}

/**
 * Send a password reset email for the given address.
 */
export async function resetPasswordForEmail(email: string, redirectTo?: string) {
  const auth = getAuthClient();
  return auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
}

/**
 * Update the current user's password.
 */
export async function updatePassword(newPassword: string) {
  const auth = getAuthClient();
  return auth.updateUser({ password: newPassword });
}

/**
 * Get the current user (if any).
 */
export async function getUser(): Promise<AuthUser | null> {
  const auth = getAuthClient();
  const { data } = await auth.getUser();
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

export async function signInWithPassword(email: string, password: string) {
  const auth = getAuthClient();
  return auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle(redirectTo?: string) {
  const auth = getAuthClient();
  return auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  });
}

export async function signOut() {
  const auth = getAuthClient();
  return auth.signOut();
}

export async function getSession(): Promise<AuthSession | null> {
  const auth = getAuthClient();
  const { data } = await auth.getSession();
  return data.session;
}

export function onAuthStateChange(handler: (event: string, session: AuthSession | null) => void) {
  const auth = getAuthClient();
  return auth.onAuthStateChange((event: any, session: any) => handler(String(event), session));
}

export function requireUser(session: AuthSession | null) {
  if (!session?.user) {
    throw new Error('User is required but none found');
  }
}
