import type { AnalyzeMessageRequest, PreflightResponse, PreflightSignal } from "@ftc/peacepad-sdk";

// Adapted from:
// - APPS/peacepad/server/aiHelper.ts
// - APPS/peacepad/tests/unit/cesEscalation.test.ts
// - APPS/peacepad/CES_TEST_SCRIPT.md

type RiskLevel = PreflightResponse["risk_level"];
type SignalCategory = PreflightSignal["category"];

interface RuleDefinition {
  pattern: RegExp;
  code: string;
  category: SignalCategory;
  weight: number;
  description: string;
  moderationFlag?: string;
}

interface ReductionRule {
  pattern: RegExp;
  code: string;
  category: SignalCategory;
  reduction: number;
  description: string;
}

interface EvaluationState {
  normalized: string;
  score: number;
  signals: PreflightSignal[];
  moderationFlags: Set<string>;
  matchedCodes: Set<string>;
  positiveSignals: number;
  sensitiveContext: boolean;
  childContext: boolean;
}

interface LocalResolvedDecision {
  kind: "resolved";
  classification: "safe" | "mild" | "strong";
  response: PreflightResponse;
}

interface LocalFallbackDecision {
  kind: "fallback";
  classification: "ambiguous";
  reason: string;
  score: number;
  signals: PreflightSignal[];
}

export type LocalPreflightDecision = LocalResolvedDecision | LocalFallbackDecision;

const CONTRACT_VERSION = "peacepad-preflight@1";
const LOCAL_RULESET_VERSION = "extension-local-rules-v1";

const STRONG_RULES: RuleDefinition[] = [
  {
    pattern: /\bfuck\b|\bfucking\b|fuck you|fuck off|shut the fuck up/,
    code: "hostile_language",
    category: "linguistic",
    weight: 42,
    description: "Profanity or direct hostile language detected",
    moderationFlag: "profanity",
  },
  {
    pattern: /\bshit\b|\basshole\b|\bbitch\b|\bbastard\b|piece of shit|scumbag|go to hell|drop dead/,
    code: "hostile_language",
    category: "linguistic",
    weight: 36,
    description: "Aggressive insult detected",
    moderationFlag: "harassment",
  },
  {
    pattern: /\bi(?:'| wi)?ll\s+(take|get)\s+(full|sole)\s+custody\b|\byou(?:'| wi)?ll\s+never\s+see\s+(the\s+)?(kids?|children|them)\b/,
    code: "legal_escalation",
    category: "contextual",
    weight: 38,
    description: "Threatening custody or access language detected",
    moderationFlag: "threat",
  },
  {
    pattern: /\byou\s+never\s+care\s+about\s+(the\s+)?(kids?|children|them)\b/,
    code: "dismissive_attack",
    category: "linguistic",
    weight: 30,
    description: "Direct attack about care for the children",
    moderationFlag: "harassment",
  },
  {
    pattern: /\bterrible\s+(parent|mother|father|co-parent)\b|\bbad\s+parent\b|\bunfit\s+parent\b/,
    code: "dismissive_attack",
    category: "linguistic",
    weight: 30,
    description: "Direct parenting insult detected",
    moderationFlag: "harassment",
  },
  {
    pattern: /\bare\s+you\s+(slow|dumb|stupid|crazy|insane)\b|\byou\s+(are|must\s+be)\s+(dumb|stupid|slow|crazy|an?\s+idiot)\b|\bpathetic\b|\bworthless\b|\buseless\b/,
    code: "dismissive_attack",
    category: "linguistic",
    weight: 28,
    description: "Direct personal insult detected",
    moderationFlag: "harassment",
  },
  {
    pattern: /\bif\s+you\s+(don't|do not|won't|will not)\b.*\bi(?:'| wi)?ll\b|\byou\s+better\b|\bor\s+else\b|\blast\s+chance\b/,
    code: "pressure_control",
    category: "behavioral",
    weight: 24,
    description: "Ultimatum or pressure language detected",
    moderationFlag: "threat",
  },
];

const MILD_RULES: RuleDefinition[] = [
  {
    pattern: /\byou\s+always\s+(mess|screw|ruin|forget|ignore|lie|fail|break|miss|skip|cancel|flake)\b/,
    code: "accusatory",
    category: "linguistic",
    weight: 9,
    description: "Pattern accusation detected",
  },
  {
    pattern: /\byou\s+never\s+(listen|help|care|try|remember|pay|show|answer|respond|follow)\b/,
    code: "accusatory",
    category: "linguistic",
    weight: 9,
    description: "Pattern accusation detected",
  },
  {
    pattern: /\byou\s+always\b.*\b(late|late again)\b|\balways\s+late\b.*\b(pickup|pick up|dropoff|drop off)\b/,
    code: "accusatory",
    category: "linguistic",
    weight: 10,
    description: "Repeated lateness accusation detected",
  },
  {
    pattern: /\bas\s+usual\b.*\blate\b|\blate\s+again\b/,
    code: "accusatory",
    category: "linguistic",
    weight: 9,
    description: "Resentful lateness phrasing detected",
  },
  {
    pattern: /\btired\s+of\s+reminding\b|\bi(?:'| a)?m\s+(so\s+)?tired\s+of\b/,
    code: "emotional_charge",
    category: "linguistic",
    weight: 8,
    description: "Repeated resentment or fatigue expressed",
  },
  {
    pattern: /\byour\s+fault\b|\bbecause\s+of\s+you\b|\btypical\s+(of\s+)?you\b/,
    code: "accusatory",
    category: "linguistic",
    weight: 9,
    description: "Direct blame statement detected",
  },
  {
    pattern: /\bthis\s+is\s+(so\s+)?(hard|difficult|exhausting|overwhelming)\b|\bi\s+can(?:'|’)t\s+(take|handle|do)\s+this\b/,
    code: "emotional_charge",
    category: "linguistic",
    weight: 7,
    description: "High emotional intensity detected",
  },
  {
    pattern: /\bwhatever\b|\bthat(?:'|’)s\s+not\s+(the\s+)?(point|issue)\b/,
    code: "evasion",
    category: "behavioral",
    weight: 8,
    description: "Dismissive or evasive phrasing detected",
  },
];

const REDUCTION_RULES: ReductionRule[] = [
  {
    pattern: /\bthank\s+you\b|\bthanks\b/,
    code: "collaborative_language",
    category: "behavioral",
    reduction: 10,
    description: "Expression of gratitude",
  },
  {
    pattern: /\bcould\s+we\b|\bcan\s+we\b/,
    code: "collaborative_language",
    category: "behavioral",
    reduction: 8,
    description: "Collaborative request",
  },
  {
    pattern: /\bplease\s+let\s+me\s+know\b|\bwhat\s+works\s+best\b|\bwhat\s+do\s+you\s+think\b/,
    code: "collaborative_language",
    category: "behavioral",
    reduction: 9,
    description: "Seeking input respectfully",
  },
  {
    pattern: /\blet(?:'|’)s\s+(work|figure|sort)\s+(this\s+)?out\b|\bi\s+understand\b|\bi\s+hear\s+you\b/,
    code: "collaborative_language",
    category: "behavioral",
    reduction: 12,
    description: "Collaborative framing",
  },
  {
    pattern: /\bfor\s+the\s+(kids?|children)\b|\bfor\s+our\s+(kids?|children)\b/,
    code: "child_focus",
    category: "contextual",
    reduction: 8,
    description: "Child-focused framing",
  },
];

const SENSITIVE_CONTEXT_PATTERN =
  /\b(lawyer|court|custody|support|money|payment|pay|paid|school\s*supplies?|expenses?|pickup|pick up|dropoff|drop off|late)\b/;

const CHILD_CONTEXT_PATTERN =
  /\b(kids?|children|son|daughter|school\s*supplies?|pickup|pick up|dropoff|drop off)\b/;

const SIMPLE_SAFE_PATTERN =
  /\b(hi|hello|hey|outside|on\s+my\s+way|please|thanks|tomorrow|today|pick(?:ing)?\s+(him|her|them)\s+up|drop(?:ping)?\s+(him|her|them)\s+off)\b/;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function addSignal(
  state: EvaluationState,
  rule: RuleDefinition,
  overrideWeight?: number,
): void {
  const signalKey = `${rule.code}:${rule.description}`;
  if (state.matchedCodes.has(signalKey)) {
    return;
  }

  state.matchedCodes.add(signalKey);
  state.score += overrideWeight ?? rule.weight;
  state.signals.push({
    category: rule.category,
    code: rule.code,
    weight: overrideWeight ?? rule.weight,
    description: rule.description,
  });
  if (rule.moderationFlag) {
    state.moderationFlags.add(rule.moderationFlag);
  }
}

function addReduction(state: EvaluationState, rule: ReductionRule): void {
  const signalKey = `${rule.code}:${rule.description}`;
  if (state.matchedCodes.has(signalKey)) {
    return;
  }

  state.matchedCodes.add(signalKey);
  state.score = Math.max(0, state.score - rule.reduction);
  state.positiveSignals += 1;
  state.signals.push({
    category: rule.category,
    code: rule.code,
    weight: -rule.reduction,
    description: rule.description,
  });
}

function addDynamicSignals(state: EvaluationState, originalText: string): void {
  if (/!{2,}|\?{2,}|!\?|\?!/.test(originalText)) {
    addSignal(state, {
      pattern: /!/,
      code: "emotional_charge",
      category: "linguistic",
      weight: 6,
      description: "Escalating punctuation detected",
    });
  }

  const letters = originalText.replace(/[^a-z]/gi, "");
  const upperLetters = originalText.replace(/[^A-Z]/g, "");
  if (letters.length >= 8 && upperLetters.length / Math.max(letters.length, 1) >= 0.65) {
    addSignal(state, {
      pattern: /[A-Z]/,
      code: "emotional_charge",
      category: "linguistic",
      weight: 12,
      description: "All-caps emphasis detected",
    });
  }
}

function generateLocalCalmVersion(state: EvaluationState): string | null {
  const text = state.normalized;

  if (
    state.moderationFlags.has("profanity") ||
    state.moderationFlags.has("harassment") ||
    state.matchedCodes.has("dismissive_attack:Direct personal insult detected")
  ) {
    return "I'm upset right now. Let's pause and focus on what needs to happen for the kids.";
  }

  if (state.moderationFlags.has("threat")) {
    return "I'd like to resolve this calmly. Can we agree on the next step for the kids without escalating it further right now?";
  }

  if (/\bpickup|pick up|dropoff|drop off\b/.test(text) && /\blate\b/.test(text)) {
    return "Pickup has been running late recently. Can we keep it closer to the agreed time so the routine stays consistent?";
  }

  if (/\byou\s+never\s+care\s+about\s+(the\s+)?(kids?|children|them)\b/.test(text)) {
    return "I'm worried about consistency for the kids. Can we focus on what they need right now and agree on the next step?";
  }

  if (/\btired\s+of\s+reminding\b|\bas\s+usual\b.*\blate\b|\blate\s+again\b/.test(text)) {
    return "I've had to follow up a few times. Can we agree on a clear plan going forward?";
  }

  if (state.signals.some((signal) => signal.code === "accusatory")) {
    return "I'm concerned about this pattern. Can we reset expectations and focus on a workable plan?";
  }

  if (state.signals.some((signal) => signal.code === "emotional_charge")) {
    return "I'm finding this frustrating. Can we slow this down and focus on the next step for the kids?";
  }

  return "Can we focus on the issue and work out a clear plan together?";
}

function buildResponse(
  classification: "safe" | "mild" | "strong",
  state: EvaluationState,
): PreflightResponse {
  const conflictScore = classification === "safe"
    ? Math.min(state.score, 12)
    : classification === "mild"
      ? Math.max(35, Math.min(state.score * 3, 64))
      : Math.max(75, Math.min(state.score * 2, 96));

  const riskLevel: RiskLevel = classification === "safe"
    ? "low"
    : classification === "mild"
      ? "medium"
      : state.moderationFlags.has("threat")
        ? "critical"
        : "high";

  const calmVersion = classification === "safe" ? null : generateLocalCalmVersion(state);
  const recommendation = classification === "safe"
    ? "send_as_is"
    : classification === "mild"
      ? "review_and_rewrite"
      : "pause_before_send";

  return {
    conflict_score: conflictScore,
    risk_level: riskLevel,
    signals: state.signals,
    moderation_flags: Array.from(state.moderationFlags),
    recommendation,
    calm_version: calmVersion,
    send_policy: {
      allow_send_original: true,
      requires_acknowledgement: classification === "strong",
      recommended_action: recommendation,
      pause_minutes: classification === "strong" ? (state.moderationFlags.has("threat") ? 20 : 10) : null,
    },
    model_or_ruleset_version: {
      contract: CONTRACT_VERSION,
      tone_model: "local-rules",
      escalation_ruleset: LOCAL_RULESET_VERSION,
    },
    source: {
      tone: classification === "safe" ? "neutral" : classification === "mild" ? "frustrated" : "hostile",
      summary: `local rule matched: ${classification}`,
    },
  };
}

export function evaluateLocalPreflight(input: AnalyzeMessageRequest): LocalPreflightDecision {
  const normalized = normalizeText(input.text || "");
  const state: EvaluationState = {
    normalized,
    score: 0,
    signals: [],
    moderationFlags: new Set<string>(),
    matchedCodes: new Set<string>(),
    positiveSignals: 0,
    sensitiveContext: SENSITIVE_CONTEXT_PATTERN.test(normalized),
    childContext: CHILD_CONTEXT_PATTERN.test(normalized),
  };

  if (!normalized) {
    return {
      kind: "resolved",
      classification: "safe",
      response: buildResponse("safe", state),
    };
  }

  for (const rule of STRONG_RULES) {
    if (rule.pattern.test(normalized)) {
      addSignal(state, rule);
    }
  }

  for (const rule of MILD_RULES) {
    if (rule.pattern.test(normalized)) {
      addSignal(state, rule);
    }
  }

  for (const rule of REDUCTION_RULES) {
    if (rule.pattern.test(normalized)) {
      addReduction(state, rule);
    }
  }

  addDynamicSignals(state, input.text);

  const hasStrongModeration = state.moderationFlags.size > 0;
  const hasStrongScore = state.score >= 24;
  const hasMildScore = state.score >= 8;
  const lowScore = state.score <= 2;
  const uncertaintyBand = state.score > 2 && state.score < 8;
  const conflictingSignals = state.positiveSignals > 0 && state.signals.some((signal) => signal.weight > 0);
  const simpleSafe = SIMPLE_SAFE_PATTERN.test(normalized);

  if (hasStrongModeration || hasStrongScore) {
    return {
      kind: "resolved",
      classification: "strong",
      response: buildResponse("strong", state),
    };
  }

  if (hasMildScore && !(state.sensitiveContext && state.childContext && conflictingSignals)) {
    return {
      kind: "resolved",
      classification: "mild",
      response: buildResponse("mild", state),
    };
  }

  if ((lowScore && !state.sensitiveContext) || (!state.signals.length && simpleSafe) || (!state.signals.length && !state.sensitiveContext)) {
    return {
      kind: "resolved",
      classification: "safe",
      response: buildResponse("safe", state),
    };
  }

  if (uncertaintyBand || conflictingSignals || (state.sensitiveContext && state.childContext)) {
    return {
      kind: "fallback",
      classification: "ambiguous",
      reason: "local rule score ambiguous, using api fallback",
      score: state.score,
      signals: state.signals,
    };
  }

  return {
    kind: "resolved",
    classification: "safe",
    response: buildResponse("safe", state),
  };
}

