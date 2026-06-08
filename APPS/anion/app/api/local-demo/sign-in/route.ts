import { NextRequest, NextResponse } from 'next/server';
import { isLocalDemoEnabled } from '@/app/lib/local-demo';

export async function GET(request: NextRequest) {
  if (!isLocalDemoEnabled()) {
    return NextResponse.json({ ok: false, code: 'LOCAL_DEMO_DISABLED' }, { status: 404 });
  }

  const role = request.nextUrl.searchParams.get('role');
  if (role !== 'parent' && role !== 'tutor' && role !== 'student' && role !== 'admin') {
    return NextResponse.json({ ok: false, code: 'INVALID_DEMO_ROLE' }, { status: 400 });
  }

  const next = request.nextUrl.searchParams.get('next');
  const redirectTarget = next && next.startsWith('/') ? next : `/${role === 'admin' ? 'admin' : role}`;
  const response = NextResponse.redirect(new URL(redirectTarget, request.url));
  response.cookies.set('anion_demo_role', role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
