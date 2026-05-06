import { NextResponse } from 'next/server';
import type { PlatformStatusResponse } from '@/src/types/api/scaffolds';

export async function GET() {
  const response: PlatformStatusResponse = {
    ok: true,
    service: 'anion-web',
    phase: 'M2-M5-scaffold-bootstrap',
    placeholders: {
      m2Booking: 'planned',
      m3Billing: 'scaffolded',
      m4LiveClassroom: 'scaffolded',
      m5OpsQa: 'scaffolded',
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
