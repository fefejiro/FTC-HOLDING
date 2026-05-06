import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { applyApiSecurityHeaders, handleApiCorsPreflight, isApiRequestOriginDenied } from '@/app/lib/security/http';

export async function middleware(request: NextRequest) {
  const isApiPath = request.nextUrl.pathname.startsWith('/api/');

  if (isApiPath && request.method === 'OPTIONS') {
    return handleApiCorsPreflight(request);
  }

  if (isApiPath && isApiRequestOriginDenied(request)) {
    const denied = NextResponse.json({ ok: false, code: 'CORS_ORIGIN_DENIED' }, { status: 403 });
    return applyApiSecurityHeaders(denied, request);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — do NOT remove this call.
  await supabase.auth.getUser();

  if (isApiPath) {
    return applyApiSecurityHeaders(supabaseResponse, request);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
