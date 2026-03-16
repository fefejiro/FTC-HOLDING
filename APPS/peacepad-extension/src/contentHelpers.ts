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

export interface PreflightExplanation {
  flaggedFor: string[];
  saferBecause: string[];
}

export interface SendOriginalLoopSuppressionState {
  fingerprint: string;
  until: number;
}

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
  return site === "whatsapp" ? "Use Suggestion" : "Use Suggestion";
}

export function getReviewNote(site: SupportedSite): string {
  return site === "whatsapp"
    ? "SendSmart Guardian will place the suggestion into WhatsApp for you and leave it editable. If direct replacement is blocked, Guardian falls back to a safe manual replace flow."
    : "PeacePad will try to send your approved message after review. If the site will not accept the direct send safely, the approved message will be copied so you can paste it manually.";
}

export function shouldSuppressSendOriginalLoop(
  currentFingerprint: string,
  state: SendOriginalLoopSuppressionState | null,
  now = Date.now(),
): boolean {
  if (!state?.fingerprint) {
    return false;
  }

  if (now > state.until) {
    return false;
  }

  return currentFingerprint === state.fingerprint;
}

function hasSignal(preflight: PreflightResponse, ...codes: string[]): boolean {
  return preflight.signals.some((signal) => signal.weight > 0 && codes.includes(signal.code));
}

function addUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function getPreflightExplanation(preflight: PreflightResponse): PreflightExplanation {
  const flaggedFor: string[] = [];
  const saferBecause: string[] = [];
  const tone = String(preflight.source?.tone || "").toLowerCase();

  if (hasSignal(preflight, "hostile_language", "dismissive_attack") || tone === "hostile") {
    addUnique(flaggedFor, "hostility");
  }

  if (hasSignal(preflight, "accusatory")) {
    addUnique(flaggedFor, "blame");
  }

  if (
    hasSignal(preflight, "legal_escalation", "emotional_charge")
    || preflight.recommendation === "pause_before_send"
    || tone === "defensive"
    || tone === "frustrated"
  ) {
    addUnique(flaggedFor, "escalation");
  }

  if (hasSignal(preflight, "pressure_control")) {
    addUnique(flaggedFor, "pressure");
  }

  if (hasSignal(preflight, "evasion")) {
    addUnique(flaggedFor, "avoidance");
  }

  if (!flaggedFor.length && (preflight.risk_level === "high" || preflight.risk_level === "critical")) {
    addUnique(flaggedFor, "conflict risk");
  }

  if (
    hasSignal(preflight, "accusatory", "pressure_control", "evasion", "legal_escalation")
    || Boolean(preflight.calm_version)
    || preflight.recommendation === "review_and_rewrite"
    || preflight.recommendation === "pause_before_send"
  ) {
    addUnique(saferBecause, "clearer");
  }

  if (
    hasSignal(preflight, "hostile_language", "dismissive_attack", "emotional_charge")
    || Boolean(preflight.calm_version)
    || tone === "hostile"
    || tone === "frustrated"
    || tone === "defensive"
  ) {
    addUnique(saferBecause, "calmer");
  }

  if (
    Boolean(preflight.calm_version)
    || hasSignal(preflight, "legal_escalation", "child_focus", "evasion")
    || preflight.recommendation === "review_and_rewrite"
    || preflight.recommendation === "pause_before_send"
  ) {
    addUnique(saferBecause, "more actionable");
  }

  if (!saferBecause.length) {
    addUnique(saferBecause, "clearer");
    addUnique(saferBecause, "calmer");
  }

  return {
    flaggedFor: flaggedFor.slice(0, 3),
    saferBecause: saferBecause.slice(0, 3),
  };
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
