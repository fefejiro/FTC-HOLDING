export type AiConsentRecord = {
  termsAcceptedAt?: Date | string | null;
  privacyAccepted?: boolean | null;
  aiMessageConsent?: boolean | null;
  aiCallConsent?: boolean | null;
};

export const AI_MESSAGE_CONSENT_REQUIRED_CODE = "AI_MESSAGE_CONSENT_REQUIRED";
export const AI_CALL_CONSENT_REQUIRED_CODE = "AI_CALL_CONSENT_REQUIRED";

export function hasPersistedAiMessageConsent(
  user: AiConsentRecord | null | undefined,
): boolean {
  return Boolean(
    user?.termsAcceptedAt &&
      user?.privacyAccepted === true &&
      user?.aiMessageConsent === true,
  );
}

export function hasPersistedAiCallConsent(
  user: AiConsentRecord | null | undefined,
): boolean {
  return Boolean(
    user?.termsAcceptedAt &&
      user?.privacyAccepted === true &&
      user?.aiCallConsent === true,
  );
}

export function buildPrivateMessageNotificationBody(isUrgent = false): string {
  return isUrgent
    ? "You have an urgent PeacePad message."
    : "You have a new PeacePad message.";
}
