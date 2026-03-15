import { describe, expect, it } from "vitest";
import {
  getApprovedActionLabel,
  getEffectivePreflightIntent,
  getModalActionOutcome,
  getReviewNote,
  getRiskBadgeTheme,
  resolveInFlightSendAction,
  resolveWhatsappHandoffDecision,
  shouldSuppressDismissedIntervention,
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
  it("uses a dedicated approved action label on WhatsApp", () => {
    expect(getApprovedActionLabel("whatsapp")).toBe("Use Approved Message");
    expect(getApprovedActionLabel("gmail")).toBe("Send Approved Message");
  });

  it("explains the guarded handoff note on WhatsApp", () => {
    expect(getReviewNote("whatsapp")).toContain("press Ctrl+V to replace");
    expect(getReviewNote("whatsapp")).toContain("send unlocks");
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
});
