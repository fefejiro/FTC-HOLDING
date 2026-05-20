import { NextResponse } from 'next/server';
import type { PlatformStatusResponse } from '@/src/types/api/scaffolds';

export async function GET() {
  const response: PlatformStatusResponse = {
    ok: true,
    service: 'anion-web',
    phase: 'phase1-call-closure-failed-auth-blocked',
    release: '0.2.7',
    runtime: {
      web: 'live',
      health: 'ok',
      authAndRoles: 'blocked-invalid-credentials',
      bookings: 'implemented-not-auth-verified',
      billing: 'ready-with-external-keys',
      liveClassroom: 'implemented-not-auth-verified',
      opsAndQa: 'blocked-phase1-fail',
    },
    blockers: {
      externalConfig: [
        'stripe_live_keys',
        'daily_api_key',
        'supabase_auth_allow_list',
        'confirmed_phase1_test_credentials',
      ],
      legal: [
        'privacy_policy_signoff',
        'terms_signoff',
      ],
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
