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

export interface GuardianModalCopy {
  title: string;
  recommendationLabel: string;
  originalLabel: string;
  suggestedLabel: string;
  editableLabel: string;
  flaggedLabel: string;
  saferLabel: string;
  helperNote: string;
  showConflictScore: boolean;
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

function getRecommendationLabel(recommendation?: string): string {
  switch (recommendation) {
    case "pause_before_send":
      return "pause before sending";
    case "send_as_is":
      return "ready to send";
    case "review_and_rewrite":
    case "consider_rephrase":
    default:
      return "review before sending";
  }
}

export function getGuardianModalCopy(
  site: SupportedSite,
  recommendation?: string,
): GuardianModalCopy {
  return {
    title: "SendSmart Guardian",
    recommendationLabel: getRecommendationLabel(recommendation),
    originalLabel: "Original",
    suggestedLabel: "Suggestion",
    editableLabel: "Edit before send",
    flaggedLabel: "Why flagged",
    saferLabel: "Why safer",
    helperNote: site === "whatsapp"
      ? "Use Suggestion inserts the reply into WhatsApp and leaves it editable."
      : "Use Suggestion applies the reply and leaves it editable when the site allows it.",
    showConflictScore: false,
  };
}

export function getReviewNote(site: SupportedSite): string {
  return getGuardianModalCopy(site).helperNote;
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

function hasSignalDescription(preflight: PreflightResponse, pattern: RegExp): boolean {
  return preflight.signals.some(
    (signal) => signal.weight > 0 && pattern.test(signal.description.toLowerCase()),
  );
}

function hasModerationFlag(preflight: PreflightResponse, ...flags: string[]): boolean {
  const activeFlags = new Set(
    (preflight.moderation_flags || []).map((flag) => String(flag || "").toLowerCase()),
  );
  return flags.some((flag) => activeFlags.has(flag));
}

function addUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function getGuardianInterpretationLine(preflight: PreflightResponse): string {
  const tone = String(preflight.source?.tone || "").toLowerCase();
  const summary = String(preflight.source?.summary || "").toLowerCase();
  const hasCoparentingContext =
    hasSignalDescription(preflight, /parenting|child|custody|kids?|children|pickup|drop ?off/)
    || /kid|child|custody|co-?parent|parenting|pickup|drop ?off/.test(summary);
  const hasBusinessContext =
    hasSignalDescription(
      preflight,
      /professional|deal-risk|deal\b|client\b|vendor\b|listing|offer|closing|inspection|contract|broker|agent/,
    )
    || /client|vendor|deal|listing|offer|closing|inspection|contract|broker|agent/.test(summary);
  const hasDealRisk = hasSignalDescription(preflight, /deal-risk|deal\b|client\b|vendor\b/);
  const hasCondescension = hasSignalDescription(
    preflight,
    /professional put-down|taunting put-down/,
  );
  const hasProfessionalRisk = hasSignalDescription(
    preflight,
    /professional|taunting|deal-risk/,
  );
  const hasHostility =
    hasSignal(preflight, "hostile_language", "dismissive_attack", "emotional_charge")
    || hasModerationFlag(preflight, "profanity", "abusive_language", "harassment")
    || tone === "hostile";
  const hasPressure = hasSignal(preflight, "pressure_control", "legal_escalation");
  const hasAccusatory = hasSignal(preflight, "accusatory");

  if (hasHostility) {
    return "This may come across as hostile.";
  }

  if (hasCoparentingContext) {
    if (hasAccusatory) {
      return "This may shift the conversation away from the actual issue.";
    }
    if (hasPressure || tone === "frustrated" || tone === "defensive") {
      return "This message may escalate the conversation.";
    }
    return "This may make co-parenting coordination harder.";
  }

  if (hasDealRisk || hasProfessionalRisk || hasCondescension || hasBusinessContext) {
    return "This message may create unnecessary friction.";
  }

  if (hasAccusatory) {
    return "This may shift the conversation away from the actual issue.";
  }

  if (hasPressure || tone === "frustrated" || tone === "defensive") {
    return "This message may escalate the conversation.";
  }

  return "This message may escalate the conversation.";
}

export function getPreflightExplanation(preflight: PreflightResponse): PreflightExplanation {
  const flaggedFor: string[] = [];
  const saferBecause: string[] = [];
  const tone = String(preflight.source?.tone || "").toLowerCase();
  const hasDealRisk = hasSignalDescription(preflight, /deal-risk|deal\b|client\b|vendor\b/);
  const hasCondescension = hasSignalDescription(
    preflight,
    /professional put-down|taunting put-down/,
  );
  const hasProfessionalRisk = hasSignalDescription(
    preflight,
    /professional|taunting|deal-risk/,
  );

  if (
    hasSignal(preflight, "hostile_language")
    || hasModerationFlag(preflight, "profanity", "abusive_language")
    || (hasSignal(preflight, "dismissive_attack") && !hasCondescension)
    || tone === "hostile"
  ) {
    addUnique(flaggedFor, "hostility");
  }

  if (hasSignal(preflight, "accusatory")) {
    addUnique(flaggedFor, "blame");
  }

  if (hasSignal(preflight, "pressure_control")) {
    addUnique(flaggedFor, "pressure");
  }

  if (hasCondescension) {
    addUnique(flaggedFor, "condescension");
  }

  if (hasDealRisk) {
    addUnique(flaggedFor, "deal risk");
  }

  if (!flaggedFor.length && (preflight.risk_level === "high" || preflight.risk_level === "critical")) {
    addUnique(flaggedFor, "conflict risk");
  }

  if (
    hasSignal(preflight, "accusatory", "pressure_control", "evasion", "legal_escalation")
    || hasProfessionalRisk
    || Boolean(preflight.calm_version)
    || preflight.recommendation === "review_and_rewrite"
    || preflight.recommendation === "pause_before_send"
  ) {
    addUnique(saferBecause, "clearer");
  }

  if (
    hasSignal(preflight, "hostile_language", "dismissive_attack", "emotional_charge")
    || hasModerationFlag(preflight, "profanity", "abusive_language", "harassment")
    || Boolean(preflight.calm_version)
    || tone === "hostile"
    || tone === "frustrated"
    || tone === "defensive"
  ) {
    addUnique(saferBecause, "calmer");
  }

  if (hasProfessionalRisk) {
    addUnique(saferBecause, "more professional");
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


