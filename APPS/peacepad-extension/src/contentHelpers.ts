import type { PreflightResponse } from "@ftc/peacepad-sdk";
import type { SupportedSite } from "./adapters";

export type ModalAction = "use_suggested" | "edit_suggested" | "send_original" | "cancel";

export interface ModalActionOutcome {
  shouldClose: boolean;
  shouldSend: boolean;
  shouldShowReplacementError: boolean;
  shouldShowSuccessNotice: boolean;
  shouldFocusComposer: boolean;
}

export interface RiskBadgeTheme {
  background: string;
  border: string;
  text: string;
}

export interface WhatsappApprovedHandoffLike {
  blockedOriginalFingerprint: string;
  approvedFingerprint: string;
}

export type WhatsappHandoffDecision = "none" | "block_original" | "allow_approved" | "changed_message";

export function resolveInFlightSendAction(
  intent: "background" | "send_gate",
): { queueSendGate: boolean; releaseImmediately: boolean } {
  if (intent === "send_gate") {
    return {
      queueSendGate: true,
      releaseImmediately: false,
    };
  }

  return {
    queueSendGate: false,
    releaseImmediately: false,
  };
}

export function getEffectivePreflightIntent(
  intent: "background" | "send_gate",
  pendingFingerprintMatches: boolean,
): "background" | "send_gate" {
  return pendingFingerprintMatches ? "send_gate" : intent;
}

export function getModalActionOutcome(
  action: ModalAction,
  replacementSucceeded: boolean,
  site: SupportedSite,
): ModalActionOutcome {
  if (action === "use_suggested") {
    return {
      shouldClose: replacementSucceeded,
      shouldSend: replacementSucceeded && site !== "whatsapp",
      shouldShowReplacementError: !replacementSucceeded,
      shouldShowSuccessNotice: replacementSucceeded && site === "whatsapp",
      shouldFocusComposer: true,
    };
  }

  if (action === "edit_suggested") {
    return {
      shouldClose: replacementSucceeded,
      shouldSend: false,
      shouldShowReplacementError: !replacementSucceeded,
      shouldShowSuccessNotice: false,
      shouldFocusComposer: true,
    };
  }

  if (action === "send_original") {
    return {
      shouldClose: true,
      shouldSend: true,
      shouldShowReplacementError: false,
      shouldShowSuccessNotice: false,
      shouldFocusComposer: false,
    };
  }

  return {
    shouldClose: true,
    shouldSend: false,
    shouldShowReplacementError: false,
    shouldShowSuccessNotice: false,
    shouldFocusComposer: true,
  };
}

export function shouldSuppressDismissedIntervention(
  intent: "background" | "send_gate",
  hasMaterialChangeFromDismissed: boolean,
): boolean {
  return intent === "background" && !hasMaterialChangeFromDismissed;
}

export function getApprovedActionLabel(site: SupportedSite): string {
  return site === "whatsapp" ? "Use Approved Message" : "Send Approved Message";
}

export function getReviewNote(site: SupportedSite): string {
  return site === "whatsapp"
    ? "WhatsApp safe mode keeps the review flow inside PeacePad. When you use an approved message here, PeacePad will copy it, select the blocked draft, and guide you to press Ctrl+V to replace it. Once the approved text is detected, send unlocks."
    : "PeacePad will try to send your approved message after review. If the site will not accept the direct send safely, the approved message will be copied so you can paste it manually.";
}

export function resolveWhatsappHandoffDecision(
  site: SupportedSite,
  handoff: WhatsappApprovedHandoffLike | null,
  currentFingerprint: string,
): WhatsappHandoffDecision {
  if (site !== "whatsapp" || !handoff) {
    return "none";
  }

  if (currentFingerprint === handoff.blockedOriginalFingerprint) {
    return "block_original";
  }

  if (currentFingerprint === handoff.approvedFingerprint) {
    return "allow_approved";
  }

  return "changed_message";
}

export function getRiskBadgeTheme(
  riskLevel: PreflightResponse["risk_level"],
): RiskBadgeTheme {
  switch (riskLevel) {
    case "critical":
      return {
        background: "#fef2f2",
        border: "#991b1b",
        text: "#991b1b",
      };
    case "high":
      return {
        background: "#fef2f2",
        border: "#dc2626",
        text: "#dc2626",
      };
    case "medium":
      return {
        background: "#fff7ed",
        border: "#ea580c",
        text: "#ea580c",
      };
    case "low":
    default:
      return {
        background: "#fefce8",
        border: "#ca8a04",
        text: "#a16207",
      };
  }
}
