import { createServerClient } from '../supabase/server';
import { redirect } from 'next/navigation';

export type AppRole = 'student' | 'parent' | 'tutor' | 'admin';

export type CurrentUser = {
  authUserId: string;
  email: string;
  profileId: string;
  displayName: string;
  role: AppRole;
};

/**
 * Server-only helper. Returns the authenticated user with their role,
 * or null if there is no active session or if Supabase is unreachable.
 *
 * Does NOT redirect — callers decide what to do on null.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    let { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return null;
    }

    let { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const role: AppRole = (roleRow?.role as AppRole) ?? 'parent';

    return {
      authUserId: user.id,
      email: user.email ?? '',
      profileId: profile.id,
      displayName: profile.display_name,
      role,
    };
  } catch (error) {
    // Network errors or Supabase unavailability should not 500 the page —
    // treat as unauthenticated so callers can redirect to /login.
    console.error('[getCurrentUser] Failed to resolve session:', error);
    return null;
  }
}

/**
 * Like getCurrentUser but redirects to /login if the session is missing.
 * Use inside auth-gated server components.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user!;
}

