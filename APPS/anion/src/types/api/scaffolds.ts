export type PlaceholderErrorResponse = {
  ok: false;
  placeholder: true;
  code: string;
  message: string;
  todo: string;
  validationErrors?: string[];
};

export type BillingCheckoutRequest = {
  bookingId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
};

export type BillingCheckoutResponse = {
  ok: false;
  placeholder: true;
  code: 'BILLING_CHECKOUT_NOT_IMPLEMENTED';
  message: string;
  todo: string;
};

export type BillingPortalRequest = {
  accountId: string;
  returnUrl: string;
};

export type BillingPortalResponse = {
  ok: false;
  placeholder: true;
  code: 'BILLING_PORTAL_NOT_IMPLEMENTED';
  message: string;
  todo: string;
};

export type StripeWebhookEnvelope = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export type DailyRoomTokenRequest = {
  bookingId: string;
  participantRole: 'student' | 'tutor';
};

export type DailyRoomTokenSuccessResponse = {
  ok: true;
  roomUrl: string;
  token?: string;
  roomName: string;
  expiresAt: string;
  localMode?: boolean;
};

export type DailyRoomTokenErrorResponse = {
  ok: false;
  code:
    | 'CSRF_MISSING_ORIGIN'
    | 'CSRF_INVALID_ORIGIN'
    | 'CSRF_CROSS_SITE_BLOCKED'
    | 'RATE_LIMITED'
    | 'INVALID_DAILY_ROOM_REQUEST'
    | 'UNAUTHENTICATED'
    | 'LESSON_ACCESS_DENIED'
    | 'DAILY_NOT_CONFIGURED'
    | 'DAILY_API_ERROR';
  message?: string;
  validationErrors?: string[];
  requestId?: string;
};

export type DailyRoomTokenResponse = DailyRoomTokenSuccessResponse | DailyRoomTokenErrorResponse;

export type PlatformStatusResponse = {
  ok: true;
  service: 'anion-web';
  phase: 'production-handoff' | 'phase1-call-closure-failed-auth-blocked' | 'phase1-call-closure-pending-production-evidence';
  release: string;
  runtime: {
    web: 'live';
    health: 'ok';
    authAndRoles: 'ready' | 'blocked-invalid-credentials' | 'blocked-public-config';
    bookings: 'ready' | 'implemented-not-auth-verified';
    billing: 'ready-with-external-keys';
    liveClassroom:
      | 'ready-with-external-keys'
      | 'daily-token-api-ready-call-ui-network-blocked'
      | 'implemented-not-auth-verified'
      | 'local-contract-green-production-evidence-pending';
    opsAndQa: 'ready' | 'blocked-phase1-fail';
  };
  blockers: {
    externalConfig: Array<
      'stripe_provider_keys' |
      'daily_api_key' |
      'supabase_auth_allow_list' |
      'supabase_public_bundle_placeholder' |
      'supabase_service_role_invalid' |
      'daily_call_ui_cdn_unreachable' |
      'stripe_subscription_state_unverified' |
      'phase1_domain_fixture_missing' |
      'confirmed_phase1_test_credentials'
    >;
    legal: Array<'privacy_policy_signoff' | 'terms_signoff'>;
  };
  timestamp: string;
};
