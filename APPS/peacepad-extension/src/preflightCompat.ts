export interface LegacyPreviewSignal {
  type: "linguistic" | "behavioral" | "contextual" | "pattern";
  signal: string;
  weight: number;
  description: string;
}

export interface LegacyPreviewCesResponse {
  score: number;
  state: string;
  interventionLevel: "none" | "soft_nudge" | "modal" | "hard_block";
  trajectory: string;
  signals: LegacyPreviewSignal[];
  suggestedActions: string[];
  pauseRecommended: boolean;
  pauseDuration?: number;
  childImpactReminder: boolean;
  deescalationSuggestion?: string | null;
}

export interface LegacyPreviewResponse {
  tone: string;
  summary: string;
  emoji: string;
  rewordingSuggestion?: string | null;
  originalMessage: string;
  manipulationFlags?: string[];
  ces: LegacyPreviewCesResponse | null;
}

export interface CompatibilityPreflightSignal {
  category: "linguistic" | "behavioral" | "contextual" | "pattern";
  code: string;
  weight: number;
  description: string;
}

export interface CompatibilityPreflightResponse {
  conflict_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  signals: CompatibilityPreflightSignal[];
  moderation_flags: string[];
  recommendation: string;
  calm_version: string | null;
  send_policy: {
    allow_send_original: boolean;
    requires_acknowledgement: boolean;
    recommended_action: string;
    pause_minutes: number | null;
  };
  model_or_ruleset_version: {
    contract: string;
    tone_model: string;
    escalation_ruleset: string;
  };
  source: {
    tone: string;
    summary: string;
  };
}

function mapInterventionToRecommendation(intervention: LegacyPreviewCesResponse["interventionLevel"] | undefined): string {
  switch (intervention) {
    case "hard_block":
      return "pause_before_send";
    case "modal":
      return "review_and_rewrite";
    case "soft_nudge":
      return "consider_rephrase";
    case "none":
    default:
      return "send_or_review";
  }
}

function mapToneToScore(tone: string): number {
  const normalized = String(tone || "").toLowerCase();
  if (normalized === "hostile") return 82;
  if (normalized === "defensive") return 58;
  if (normalized === "frustrated" || normalized === "tense") return 45;
  return 22;
}

function mapScoreToRisk(score: number): CompatibilityPreflightResponse["risk_level"] {
  if (score >= 76) return "critical";
  if (score >= 56) return "high";
  if (score >= 31) return "medium";
  return "low";
}

function mapModerationFlags(
  tone: string,
  signals: CompatibilityPreflightSignal[],
  manipulationFlags?: string[],
): string[] {
  const flags = new Set<string>();
  const normalizedTone = String(tone || "").toLowerCase();

  if (normalizedTone === "hostile") {
    flags.add("hostile_tone");
  }

  for (const signal of signals) {
    switch (signal.code) {
      case "hostile_language":
        flags.add("abusive_language");
        break;
      case "dismissive_attack":
        flags.add("harassment");
        break;
      case "pressure_control":
        flags.add("coercive_language");
        break;
      case "legal_escalation":
        flags.add("legal_escalation");
        break;
      default:
        break;
    }
  }

  for (const flag of manipulationFlags || []) {
    if (typeof flag === "string" && flag.trim()) {
      flags.add(flag.trim().toLowerCase().replace(/\s+/g, "_"));
    }
  }

  return Array.from(flags);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isLegacyPreviewResponse(payload: unknown): payload is LegacyPreviewResponse {
  if (!isRecord(payload)) return false;
  return typeof payload.tone === "string" && typeof payload.summary === "string" && typeof payload.originalMessage === "string";
}

export function mapLegacyPreviewToPreflight(preview: LegacyPreviewResponse): CompatibilityPreflightResponse {
  const ces = preview.ces || null;
  const conflictScore = ces?.score ?? mapToneToScore(preview.tone);
  const recommendation = mapInterventionToRecommendation(ces?.interventionLevel);
  const signals: CompatibilityPreflightSignal[] = (ces?.signals || []).map((signal) => ({
    category: signal.type,
    code: signal.signal,
    weight: signal.weight,
    description: signal.description,
  }));
  const calmVersion =
    (typeof ces?.deescalationSuggestion === "string" && ces.deescalationSuggestion.trim())
      ? ces.deescalationSuggestion.trim()
      : (typeof preview.rewordingSuggestion === "string" && preview.rewordingSuggestion.trim())
        ? preview.rewordingSuggestion.trim()
        : null;

  return {
    conflict_score: conflictScore,
    risk_level: mapScoreToRisk(conflictScore),
    signals,
    moderation_flags: mapModerationFlags(preview.tone, signals, preview.manipulationFlags),
    recommendation,
    calm_version: calmVersion,
    send_policy: {
      allow_send_original: true,
      requires_acknowledgement: ces?.interventionLevel === "hard_block",
      recommended_action: recommendation,
      pause_minutes: typeof ces?.pauseDuration === "number" ? ces.pauseDuration : null,
    },
    model_or_ruleset_version: {
      contract: "preflight-v1-compat",
      tone_model: "legacy-preview",
      escalation_ruleset: "ces-v1",
    },
    source: {
      tone: preview.tone,
      summary: preview.summary,
    },
  };
}

export function shouldFallbackToLegacyPreview(errorMessage: string | undefined, status: number | undefined): boolean {
  if (status !== 404) return false;
  const normalized = String(errorMessage || "").toLowerCase();
  return normalized.includes("only serves the peacepad api") || normalized.includes("/api/v1/message/preflight") || normalized.includes("404");
}
