import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRuntimeCanonicalOrigin,
  getRuntimeEnvValue,
  getRuntimeSupabaseAnonKey,
  getRuntimeSupabaseUrl,
} from '@/app/lib/runtime-env';

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

function displayNameForUser(user: AuthUser) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Anion user'
  );
}

async function ensureDefaultProfileForUser(user: AuthUser, supabaseUrl: string) {
  const serviceRoleKey = getRuntimeEnvValue('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    console.error('[auth/callback] Missing SUPABASE_SERVICE_ROLE_KEY; cannot provision profile.');
    return false;
  }

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const displayName = displayNameForUser(user);

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .upsert(
      {
        auth_user_id: user.id,
        display_name: displayName,
      },
      { onConflict: 'auth_user_id', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (profileError || !profile) {
    console.error('[auth/callback] Profile provisioning failed:', profileError?.message);
    return false;
  }

  const { error: roleError } = await service
    .from('user_roles')
    .upsert(
      {
        profile_id: profile.id,
        role: 'parent',
      },
      { onConflict: 'profile_id,role', ignoreDuplicates: true },
    );

  if (roleError) {
    console.error('[auth/callback] Default role provisioning failed:', roleError.message);
    return false;
  }

  const { error: parentError } = await service
    .from('parents')
    .upsert(
      {
        profile_id: profile.id,
      },
      { onConflict: 'profile_id', ignoreDuplicates: true },
    );

  if (parentError) {
    console.error('[auth/callback] Parent row provisioning failed:', parentError.message);
    return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next');
  const successRedirect = next && next.startsWith('/') ? next : '/dashboard';
  const failureRedirect = '/login?error=auth_callback_failed';
  const canonicalOrigin = getRuntimeCanonicalOrigin(origin);
  const supabaseUrl = getRuntimeSupabaseUrl();
  const supabaseAnonKey = getRuntimeSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${canonicalOrigin}${failureRedirect}`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.user ?? (await supabase.auth.getUser()).data.user;
      if (!user || !(await ensureDefaultProfileForUser(user, supabaseUrl))) {
        return NextResponse.redirect(`${canonicalOrigin}${failureRedirect}`);
      }
      return NextResponse.redirect(`${canonicalOrigin}${successRedirect}`);
    }
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      const user = data.user ?? (await supabase.auth.getUser()).data.user;
      if (!user || !(await ensureDefaultProfileForUser(user, supabaseUrl))) {
        return NextResponse.redirect(`${canonicalOrigin}${failureRedirect}`);
      }
      return NextResponse.redirect(`${canonicalOrigin}${successRedirect}`);
    }
  }

  // Something went wrong — send back to login with error indicator
  return NextResponse.redirect(`${canonicalOrigin}${failureRedirect}`);
}
