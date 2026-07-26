import { describe, expect, it } from "vitest";
import {
  buildPrivateMessageNotificationBody,
  hasPersistedAiCallConsent,
  hasPersistedAiMessageConsent,
} from "./privacyControls";

describe("privacy controls", () => {
  it("requires an explicit persisted true value for message AI", () => {
    expect(hasPersistedAiMessageConsent(undefined)).toBe(false);
    expect(hasPersistedAiMessageConsent({})).toBe(false);
    expect(hasPersistedAiMessageConsent({ aiMessageConsent: null })).toBe(false);
    expect(hasPersistedAiMessageConsent({ aiMessageConsent: false })).toBe(false);
    expect(hasPersistedAiMessageConsent({ aiMessageConsent: true })).toBe(false);
    expect(
      hasPersistedAiMessageConsent({
        termsAcceptedAt: new Date(),
        privacyAccepted: false,
        aiMessageConsent: true,
      }),
    ).toBe(false);
    expect(
      hasPersistedAiMessageConsent({
        termsAcceptedAt: new Date(),
        privacyAccepted: true,
        aiMessageConsent: true,
      }),
    ).toBe(true);
  });

  it("requires an explicit persisted true value for call AI", () => {
    expect(hasPersistedAiCallConsent(undefined)).toBe(false);
    expect(hasPersistedAiCallConsent({})).toBe(false);
    expect(hasPersistedAiCallConsent({ aiCallConsent: null })).toBe(false);
    expect(hasPersistedAiCallConsent({ aiCallConsent: false })).toBe(false);
    expect(hasPersistedAiCallConsent({ aiCallConsent: true })).toBe(false);
    expect(
      hasPersistedAiCallConsent({
        termsAcceptedAt: new Date(),
        privacyAccepted: true,
        aiCallConsent: true,
      }),
    ).toBe(true);
  });

  it("never includes user message content in notification bodies", () => {
    expect(buildPrivateMessageNotificationBody()).toBe(
      "You have a new PeacePad message.",
    );
    expect(buildPrivateMessageNotificationBody(true)).toBe(
      "You have an urgent PeacePad message.",
    );
  });
});
