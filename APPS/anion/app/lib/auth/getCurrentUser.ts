import { createServerClient } from '../supabase/server';
import { redirect } from 'next/navigation';
import { getLocalDemoCurrentUser, isLocalDemoEnabled } from '../local-demo';
import { resolveActiveRole, type AppRole } from './roles';

export type { AppRole };

export type CurrentUser = {
  authUserId: string;
  email: string;
  profileId: string;
  displayName: string;
  role: AppRole;
  roles: AppRole[];
};

export type GetCurrentUserOptions = {
  preferredRole?: AppRole | AppRole[];
};

/**
 * Server-only helper. Returns the authenticated user with their role,
 * or null if there is no active session or if Supabase is unreachable.
 *
 * Does NOT redirect — callers decide what to do on null.
 */
export async function getCurrentUser(options: GetCurrentUserOptions = {}): Promise<CurrentUser | null> {
  try {
    if (isLocalDemoEnabled()) {
      const localDemoUser = await getLocalDemoCurrentUser();
      if (localDemoUser) {
        const roles = [localDemoUser.role];
        return { ...localDemoUser, roles, role: resolveActiveRole(roles, options.preferredRole) };
      }
    }

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

    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: true });

    const allowedRoles: AppRole[] = ['student', 'parent', 'tutor', 'admin'];
    const roles = ((roleRows ?? []) as Array<{ role: AppRole }>)
      .map((row) => row.role)
      .filter((role): role is AppRole => allowedRoles.includes(role));
    const resolvedRoles: AppRole[] = roles.length > 0 ? roles : ['parent'];
    const role = resolveActiveRole(resolvedRoles, options.preferredRole);

    return {
      authUserId: user.id,
      email: user.email ?? '',
      profileId: profile.id,
      displayName: profile.display_name,
      role,
      roles: resolvedRoles,
    };
  } catch (error) {
    const dynamicServerUsage =
      typeof error === 'object' &&
      error !== null &&
      ((error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE' ||
        String((error as { description?: string }).description ?? '').includes('Dynamic server usage'));

    if (dynamicServerUsage) {
      return null;
    }

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

