import { NextResponse } from 'next/server';
import type { PlatformStatusResponse } from '@/src/types/api/scaffolds';

export async function GET() {
  const response: PlatformStatusResponse = {
    ok: true,
    service: 'anion-web',
    phase: 'phase1-call-closure-pending-production-evidence',
    release: '0.2.17',
    runtime: {
      web: 'live',
      health: 'ok',
      authAndRoles: 'ready',
      bookings: 'ready',
      billing: 'ready-with-external-keys',
      liveClassroom: 'daily-token-api-ready-call-ui-network-blocked',
      opsAndQa: 'blocked-phase1-fail',
    },
    blockers: {
      externalConfig: [
        'supabase_service_role_invalid',
        'stripe_subscription_state_unverified',
        'daily_call_ui_cdn_unreachable',
      ],
      legal: ['privacy_policy_signoff', 'terms_signoff'],
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
