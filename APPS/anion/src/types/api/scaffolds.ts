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
  phase: string;
  release: string;
  runtime: {
    web: 'live';
    health: 'ok';
    authAndRoles: string;
    bookings: string;
    billing: string;
    liveClassroom: string;
    opsAndQa: string;
  };
  blockers: {
    externalConfig: string[];
    legal: string[];
  };
  timestamp: string;
};
