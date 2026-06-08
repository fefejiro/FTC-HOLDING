import { NextResponse } from 'next/server';
import type { PlatformStatusResponse } from '@/src/types/api/scaffolds';

export async function GET() {
  const response: PlatformStatusResponse = {
    ok: true,
    service: 'anion-web',
    phase: 'phase1-call-closure-pending-production-evidence',
    release: '0.2.14',
    runtime: {
      web: 'live',
      health: 'ok',
      authAndRoles: 'blocked-public-config',
      bookings: 'implemented-not-auth-verified',
      billing: 'ready-with-external-keys',
      liveClassroom: 'ready-with-external-keys',
      opsAndQa: 'blocked-phase1-fail',
    },
    blockers: {
      externalConfig: [
        'supabase_public_bundle_placeholder',
        'supabase_auth_allow_list',
        'confirmed_phase1_test_credentials',
      ],
      legal: ['privacy_policy_signoff', 'terms_signoff'],
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
