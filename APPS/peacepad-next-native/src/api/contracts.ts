export type ConsentPreferences = {
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  aiMessageConsent: boolean;
};

export type GuestSessionUser = {
  id: string;
  displayName?: string | null;
  isGuest?: boolean;
};

export type GuestSessionRequest = {
  sessionId?: string;
  hasAcceptedConsent: true;
  aiMessageConsent: boolean;
  aiCallConsent: false;
};

export type GuestSessionResponse = {
  success?: boolean;
  user?: GuestSessionUser;
  guestSessionId: string;
  sessionId: string;
  guestId: string;
  expiresAt: string;
  message?: string;
};

export type MessagePreviewRequest = {
  content: string;
};

export type MessagePreviewResponse = {
  tone: string;
  summary: string;
  emoji?: string | null;
  toneSummary?: string;
  toneEmoji?: string | null;
  confidence?: number;
  flags?: string[];
  rewordingSuggestion?: string | null;
  originalMessage?: string;
  ces?: null;
};

export type ApiErrorKind =
  | "auth-required"
  | "consent-required"
  | "expired"
  | "http"
  | "invalid-response"
  | "network"
  | "timeout";
