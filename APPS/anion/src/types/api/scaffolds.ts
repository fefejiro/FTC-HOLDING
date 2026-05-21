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
  userId: string;
};

export type DailyRoomTokenResponse = {
  ok: false;
  placeholder: true;
  code: 'DAILY_TOKEN_ISSUANCE_NOT_IMPLEMENTED';
  message: string;
  todo: string;
};

export type PlatformStatusResponse = {
  ok: true;
  service: 'anion-web';
  phase: 'production-handoff' | 'phase1-call-closure-failed-auth-blocked';
  release: string;
  runtime: {
    web: 'live';
    health: 'ok';
    authAndRoles: 'ready' | 'blocked-invalid-credentials';
    bookings: 'ready' | 'implemented-not-auth-verified';
    billing: 'ready-with-external-keys';
    liveClassroom: 'ready-with-external-keys' | 'implemented-not-auth-verified';
    opsAndQa: 'ready' | 'blocked-phase1-fail';
  };
  blockers: {
    externalConfig: Array<
      'stripe_live_keys' |
      'daily_api_key' |
      'supabase_auth_allow_list' |
      'confirmed_phase1_test_credentials'
    >;
    legal: Array<'privacy_policy_signoff' | 'terms_signoff'>;
  };
  timestamp: string;
};
