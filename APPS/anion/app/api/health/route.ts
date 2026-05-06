import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'anion-web',
    timestamp: new Date().toISOString(),
    phase: 'M0-platform-realignment',
  });
}
