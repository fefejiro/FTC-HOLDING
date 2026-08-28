
import { createBrowserClient, SupabaseClient } from '@ftc/supabase';
import type { AuthSession as Session, AuthUser as User } from '@supabase/supabase-js';

type AuthSurface = {
  resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ data?: unknown; error?: Error | null }>;
  updateUser(attributes: { password?: string }): Promise<{ data?: unknown; error?: Error | null }>;
  getUser(): Promise<{ data: { user: User | null } }>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ data?: unknown; error?: Error | null }>;
  signInWithOAuth(options: {
    provider: 'google';
    options?: {
      redirectTo?: string;
      queryParams?: Record<string, string>;
    };
  }): Promise<{ data?: { url?: string }; error?: Error | null }>;
  signOut(): Promise<{ data?: unknown; error?: Error | null }>;
  getSession(): Promise<{ data: { session: Session | null } }>;
  onAuthStateChange(handler: (event: string, session: Session | null) => void): unknown;
};

function getClient(): SupabaseClient {
  return createBrowserClient();
}

function getAuth(): AuthSurface {
  return getClient().auth as unknown as AuthSurface;
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
  return getAuth().resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
}

/**
 * Update the current user's password.
 */
export async function updatePassword(newPassword: string) {
  return getAuth().updateUser({ password: newPassword });
}

/**
 * Get the current user (if any).
 */
export async function getUser(): Promise<User | null> {
  const { data } = await getAuth().getUser();
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
  return getAuth().signInWithPassword({ email, password });
}

export async function signInWithGoogle(redirectTo?: string) {
  return getAuth().signInWithOAuth({
    provider: 'google',
    options: {
      ...(redirectTo ? { redirectTo } : {}),
      queryParams: { prompt: 'select_account' },
    },
  });
}

export async function signOut() {
  return getAuth().signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await getAuth().getSession();
  return data.session;
}

export function onAuthStateChange(handler: (event: string, session: Session | null) => void) {
  return getAuth().onAuthStateChange(handler);
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
