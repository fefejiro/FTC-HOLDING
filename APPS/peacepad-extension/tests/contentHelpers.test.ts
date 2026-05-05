import { describe, expect, it } from "vitest";
import {
  getApprovedActionLabel,
  getEffectivePreflightIntent,
  getGuardianModalCopy,
  getModalActionOutcome,
  getPreflightExplanation,
  getReviewNote,
  getRiskBadgeTheme,
  resolveInFlightSendAction,
  resolveWhatsappHandoffDecision,
  shouldSuppressDismissedIntervention,
  shouldSuppressSendOriginalLoop,
} from "../src/contentHelpers";

describe("send gate helpers", () => {
  it("queues a send gate when analysis is already in flight", () => {
    expect(resolveInFlightSendAction("send_gate")).toEqual({
      queueSendGate: true,
      releaseImmediately: false,
    });
  });

  it("keeps intent when there is no pending send gate", () => {
    expect(getEffectivePreflightIntent("background", false)).toBe("background");
  });
});

describe("modal action outcomes", () => {
  it("does not auto-send on WhatsApp when using a suggestion", () => {
    expect(getModalActionOutcome("use_suggested", true, "whatsapp")).toEqual({
      shouldClose: true,
      shouldSend: false,
      shouldShowReplacementError: false,
      shouldShowSuccessNotice: true,
      shouldFocusComposer: true,
    });
  });

  it("shows an error outcome when replacement verification fails", () => {
    expect(getModalActionOutcome("use_suggested", false, "whatsapp")).toEqual({
      shouldClose: false,
      shouldSend: false,
      shouldShowReplacementError: true,
      shouldShowSuccessNotice: false,
      shouldFocusComposer: true,
    });
  });

  it("keeps Send Original explicit", () => {
    expect(getModalActionOutcome("send_original", true, "whatsapp")).toEqual({
      shouldClose: true,
      shouldSend: true,
      shouldShowReplacementError: false,
      shouldShowSuccessNotice: false,
      shouldFocusComposer: false,
    });
  });
});

describe("dismissal suppression", () => {
  it("suppresses only background reopen for the same dismissed draft", () => {
    expect(shouldSuppressDismissedIntervention("background", false)).toBe(true);
    expect(shouldSuppressDismissedIntervention("send_gate", false)).toBe(false);
  });

  it("suppresses repeat interruption for an unchanged Send Original draft", () => {
    expect(
      shouldSuppressSendOriginalLoop("fuck you", {
        fingerprint: "fuck you",
        until: Date.now() + 10_000,
      }),
    ).toBe(true);

    expect(
      shouldSuppressSendOriginalLoop("updated draft", {
        fingerprint: "fuck you",
        until: Date.now() + 10_000,
      }),
    ).toBe(false);
  });
});

describe("risk badge theme", () => {
  it("maps high to a red badge", () => {
    expect(getRiskBadgeTheme("high")).toEqual({
      background: "#fef2f2",
      border: "#dc2626",
      text: "#dc2626",
    });
  });

  it("maps medium to an orange badge", () => {
    expect(getRiskBadgeTheme("medium")).toEqual({
      background: "#fff7ed",
      border: "#ea580c",
      text: "#ea580c",
    });
  });

  it("maps low to a yellow badge", () => {
    expect(getRiskBadgeTheme("low")).toEqual({
      background: "#fefce8",
      border: "#ca8a04",
      text: "#a16207",
    });
  });
});

describe("WhatsApp guarded handoff helpers", () => {
  it("uses the Guardian suggestion action label", () => {
    expect(getApprovedActionLabel("whatsapp")).toBe("Use Suggestion");
    expect(getApprovedActionLabel("gmail")).toBe("Use Suggestion");
  });

  it("returns simplified Guardian modal copy without a visible score", () => {
    expect(getGuardianModalCopy("whatsapp", "pause_before_send")).toEqual({
      title: "SendSmart Guardian",
      recommendationLabel: "pause before sending",
      originalLabel: "Original message",
      suggestedLabel: "Suggested reply",
      editableLabel: "Edit before sending",
      flaggedLabel: "Why flagged",
      saferLabel: "Why safer",
      helperNote: "Use Suggestion inserts the reply into WhatsApp and leaves it editable.",
      showConflictScore: false,
    });
  });

  it("uses the shorter WhatsApp helper note", () => {
    expect(getReviewNote("whatsapp")).toBe(
      "Use Suggestion inserts the reply into WhatsApp and leaves it editable.",
    );
  });

  it("blocks the original draft while handoff is armed", () => {
    expect(
      resolveWhatsappHandoffDecision(
        "whatsapp",
        {
          blockedOriginalFingerprint: "fuck you",
          approvedFingerprint: "i'm upset right now",
        },
        "fuck you",
      ),
    ).toBe("block_original");
  });

  it("allows the approved draft through without re-intervening", () => {
    expect(
      resolveWhatsappHandoffDecision(
        "whatsapp",
        {
          blockedOriginalFingerprint: "fuck you",
          approvedFingerprint: "i'm upset right now",
        },
        "i'm upset right now",
      ),
    ).toBe("allow_approved");
  });

  it("returns changed drafts to normal analysis", () => {
    expect(
      resolveWhatsappHandoffDecision(
        "whatsapp",
        {
          blockedOriginalFingerprint: "fuck you",
          approvedFingerprint: "i'm upset right now",
        },
        "you are always late",
      ),
    ).toBe("changed_message");
  });

  it("derives compact explanation labels from conflict signals", () => {
    expect(
      getPreflightExplanation({
        conflict_score: 84,
        risk_level: "high",
        recommendation: "pause_before_send",
        calm_version: "I'm upset right now. Let's pause and focus on what needs to happen for the kids.",
        moderation_flags: ["hostile_tone"],
        model_or_ruleset_version: {
          contract: "preflight-v1",
          tone_model: "local",
          escalation_ruleset: "local",
        },
        send_policy: {
          allow_send_original: true,
          requires_acknowledgement: true,
          recommended_action: "pause_before_send",
          pause_minutes: 10,
        },
        source: {
          tone: "hostile",
          summary: "local rule matched: strong",
        },
        signals: [
          { category: "linguistic", code: "hostile_language", weight: 18, description: "Profanity detected" },
          { category: "linguistic", code: "accusatory", weight: 10, description: "Blaming statement" },
          { category: "linguistic", code: "emotional_charge", weight: 6, description: "Escalating punctuation" },
        ],
      }),
    ).toEqual({
      flaggedFor: ["hostility", "blame"],
      saferBecause: ["clearer", "calmer", "more actionable"],
    });
  });

  it("maps business-risk signals to professional explanation chips", () => {
    expect(
      getPreflightExplanation({
        conflict_score: 42,
        risk_level: "medium",
        recommendation: "review_and_rewrite",
        calm_version: "I want to keep this moving professionally. Can we align on the next step so the deal stays on track?",
        moderation_flags: [],
        model_or_ruleset_version: {
          contract: "preflight-v1",
          tone_model: "local",
          escalation_ruleset: "local",
        },
        send_policy: {
          allow_send_original: true,
          requires_acknowledgement: false,
          recommended_action: "review_and_rewrite",
          pause_minutes: null,
        },
        source: {
          tone: "frustrated",
          summary: "local rule matched: mild",
        },
        signals: [
          { category: "linguistic", code: "dismissive_attack", weight: 12, description: "Professional put-down detected" },
          { category: "linguistic", code: "accusatory", weight: 12, description: "Deal-risk blame statement detected" },
        ],
      }),
    ).toEqual({
      flaggedFor: ["blame", "condescension", "deal risk"],
      saferBecause: ["clearer", "calmer", "more professional"],
    });
  });
});
