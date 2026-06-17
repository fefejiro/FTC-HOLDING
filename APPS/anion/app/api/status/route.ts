import { NextResponse } from 'next/server';
import type { PlatformStatusResponse } from '@/src/types/api/scaffolds';

export async function GET() {
  const response: PlatformStatusResponse = {
    ok: true,
    service: 'anion-web',
    phase: 'phase1-call-closure-pending-production-evidence',
    release: '0.2.20',
    runtime: {
      web: 'live',
      health: 'ok',
      authAndRoles: 'ready',
      bookings: 'ready',
      billing: 'ready-with-external-keys',
      liveClassroom: 'custom-call-ui-ready-production-evidence-pending',
      opsAndQa: 'blocked-phase1-fail',
    },
    blockers: {
      externalConfig: [
        'stripe_subscription_state_unverified',
        'phase1_authenticated_video_evidence_pending',
        'whiteboard_production_evidence_pending',
      ],
      legal: ['privacy_policy_signoff', 'terms_signoff'],
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
