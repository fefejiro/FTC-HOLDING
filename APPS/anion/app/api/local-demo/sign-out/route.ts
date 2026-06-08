import { NextResponse } from 'next/server';
import { isLocalDemoEnabled } from '@/app/lib/local-demo';

export async function GET(request: Request) {
  if (!isLocalDemoEnabled()) {
    return NextResponse.json({ ok: false, code: 'LOCAL_DEMO_DISABLED' }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('anion_demo_role');
  return response;
}
