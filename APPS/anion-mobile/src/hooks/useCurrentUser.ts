import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

type ProfileRow = {
  id: string;
  display_name: string;
};

type RoleRow = {
  role: string;
};

export type CurrentUser = {
  id: string;
  authUserId: string;
  profileId: string | null;
  displayName: string;
  email: string | undefined;
  role: string;
};

function getSupabaseUrl(): string {
  const url = process.env['EXPO_PUBLIC_SUPABASE_URL'];
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured.');
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
  if (!key) throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY is not configured.');
  return key;
}

function isSupabaseConfigured(): boolean {
  try {
    getSupabaseUrl();
    getSupabaseAnonKey();
    return true;
  } catch {
    return false;
  }
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return _client;
}

async function hydrateProfile(session: Session): Promise<CurrentUser> {
  const authUser = session.user;
  const client = getClient();

  const { data: profileData } = await client
    .from('anion_profiles')
    .select('id, display_name')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  const profile = profileData as ProfileRow | null;

  const roleRow = profile
    ? ((
        await client
          .from('anion_user_roles')
          .select('role')
          .eq('profile_id', profile.id)
          .maybeSingle()
      ).data as RoleRow | null)
    : null;

  return {
    // Use the Anion profile ID when available; fall back to the Supabase auth user ID.
    id: profile?.id ?? authUser.id,
    authUserId: authUser.id,
    profileId: profile?.id ?? null,
    displayName: profile?.display_name ?? authUser.email ?? 'User',
    email: authUser.email,
    role: roleRow?.role ?? 'parent',
  };
}

export function useCurrentUser() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    const client = getClient();
    let isMounted = true;

    client.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session) {
        const profile = await hydrateProfile(data.session);
        if (isMounted) setUser(profile);
      }
      if (isMounted) setIsLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (nextSession) {
        const profile = await hydrateProfile(nextSession);
        if (isMounted) setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(async (email: string) => {
    if (!configured) throw new Error('Supabase is not configured.');
    await getClient().auth.signInWithOtp({ email });
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    await getClient().auth.signOut();
    setSession(null);
    setUser(null);
  }, [configured]);

  return { user, session, isLoading, isConfigured: configured, signIn, signOut };
}