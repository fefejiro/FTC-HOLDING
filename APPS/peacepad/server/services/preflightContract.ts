import type { CESResult, CESSignal, InterventionLevel } from "../aiHelper";

export interface PreviewAnalysisResponse {
  tone: string;
  summary: string;
  emoji: string;
  rewordingSuggestion?: string | null;
  originalMessage: string;
  manipulationFlags?: string[];
  translationToPlainEnglish?: string;
  ces?: (CESResult & { deescalationSuggestion?: string | null }) | null;
}

export interface LegacyPreviewCesResponse {
  score: number;
  state: CESResult["state"];
  interventionLevel: InterventionLevel;
  trajectory: CESResult["trajectory"];
  signals: CESSignal[];
  suggestedActions: CESResult["suggestedActions"];
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
  ces: LegacyPreviewCesResponse | null;
}

export interface PreflightRequestBody {
  text: string;
  context?: string;
  channel?: string;
  mode?: string;
  metadata?: Record<string, unknown>;
}

export interface PreflightSignal {
  category: "linguistic" | "behavioral" | "contextual" | "pattern";
  code: string;
  weight: number;
  description: string;
}

export interface PreflightSendPolicy {
  allow_send_original: boolean;
  requires_acknowledgement: boolean;
  recommended_action: string;
  pause_minutes: number | null;
}

export interface PreflightResponse {
  conflict_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  signals: PreflightSignal[];
  moderation_flags: string[];
  recommendation: string;
  calm_version: string | null;
  send_policy: PreflightSendPolicy;
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

function mapInterventionToRecommendation(intervention: InterventionLevel | undefined): string {
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

function mapScoreToRisk(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 76) return "critical";
  if (score >= 56) return "high";
  if (score >= 31) return "medium";
  return "low";
}

function mapSignal(signal: CESSignal): PreflightSignal {
  return {
    category: signal.type,
    code: signal.signal,
    weight: signal.weight,
    description: signal.description,
  };
}

function mapModerationFlags(
  tone: string,
  signals: PreflightSignal[],
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

export function mapPreviewToPreflight(preview: PreviewAnalysisResponse): PreflightResponse {
  const ces = preview.ces || null;
  const conflictScore = ces?.score ?? mapToneToScore(preview.tone);
  const recommendation = mapInterventionToRecommendation(ces?.interventionLevel);
  const signals = (ces?.signals || []).map(mapSignal);
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
      contract: "preflight-v1",
      tone_model: "gpt-4o-mini",
      escalation_ruleset: "ces-v1",
    },
    source: {
      tone: preview.tone,
      summary: preview.summary,
    },
  };
}

export function mapPreviewToLegacyResponse(preview: PreviewAnalysisResponse): LegacyPreviewResponse {
  const ces = preview.ces || null;

  return {
    tone: preview.tone,
    summary: preview.summary,
    emoji: preview.emoji,
    rewordingSuggestion: preview.rewordingSuggestion,
    originalMessage: preview.originalMessage,
    ces: ces
      ? {
          score: ces.score,
          state: ces.state,
          interventionLevel: ces.interventionLevel,
          trajectory: ces.trajectory,
          signals: ces.signals,
          suggestedActions: ces.suggestedActions,
          pauseRecommended: ces.pauseRecommended,
          pauseDuration: ces.pauseDuration,
          childImpactReminder: ces.childImpactReminder,
          deescalationSuggestion: ces.deescalationSuggestion ?? null,
        }
      : null,
  };
}

function pickString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed ? trimmed : undefined;
}

export function parsePreflightRequest(rawBody: any): PreflightRequestBody | null {
  const text = pickString(rawBody?.text);
  if (!text) return null;

  const context = pickString(rawBody?.context);
  const channel = pickString(rawBody?.channel);
  const mode = pickString(rawBody?.mode);
  const metadata = rawBody?.metadata && typeof rawBody.metadata === "object" && !Array.isArray(rawBody.metadata)
    ? (rawBody.metadata as Record<string, unknown>)
    : undefined;

  return {
    text,
    ...(context ? { context } : {}),
    ...(channel ? { channel } : {}),
    ...(mode ? { mode } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function resolveConversationIdFromMetadata(metadata?: Record<string, unknown>): string | undefined {
  if (!metadata) return undefined;

  const keys = [
    "conversationId",
    "conversation_id",
    "threadId",
    "thread_id",
  ];

  for (const key of keys) {
    const candidate = pickString(metadata[key]);
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}
