import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRuntimeCanonicalOrigin,
  getRuntimeSupabaseAnonKey,
  getRuntimeSupabaseUrl,
} from '@/app/lib/runtime-env';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${canonicalOrigin}${successRedirect}`);
    }
  }

  // Something went wrong — send back to login with error indicator
  return NextResponse.redirect(`${canonicalOrigin}${failureRedirect}`);
}
