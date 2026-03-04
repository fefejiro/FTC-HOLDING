import { analyzeConflict, type ConflictAnalysis } from "../../emotionAnalyzer";
import { isOffTopicRequest } from "../../services/aiBoundaries.js";
import { MODULE_IDS, type ModuleId } from "../registry/moduleRegistry";
import { detectSafetyFlagsFromText, hasCrisisSafetyFlag } from "../services/safetySignals";
import type { IntentRouteRequest, IntentRouteResponse } from "../schemas/intent";

type AnalyzeConflictFn = (
  message: string,
  conversationHistory?: string[],
  detectedLanguage?: string,
) => Promise<ConflictAnalysis>;

export interface IntentRouterDependencies {
  analyzeConflictFn?: AnalyzeConflictFn;
}

function mapSeverityToConflictLevel(analysis: ConflictAnalysis): number {
  if (!analysis.hasConflict || analysis.conflictType === "none") {
    return 0;
  }

  if (analysis.severity === "high") {
    return 3;
  }
  if (analysis.severity === "medium") {
    return 2;
  }
  return 1;
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function pickModuleId(
  text: string,
  conflictLevel: number,
  safetyFlags: IntentRouteResponse["safety_flags"],
): ModuleId {
  const lower = text.toLowerCase();
  const hasCrisisFlag = hasCrisisSafetyFlag(safetyFlags);

  if (
    hasCrisisFlag ||
    hasPattern(lower, [/\b(hotline|shelter|resource|support near me|where can i get help)\b/i])
  ) {
    return MODULE_IDS.SUPPORT_DISCOVERY;
  }

  if (hasPattern(lower, [/\b(rewrite|rephrase|word this|draft|send this message|tone this down)\b/i])) {
    return MODULE_IDS.REWRITE_MESSAGE;
  }

  if (
    hasPattern(lower, [/\b(conflict|argument|escalat|fight|boundary|is this too harsh)\b/i]) ||
    conflictLevel >= 2
  ) {
    return MODULE_IDS.CONFLICT_CHECK;
  }

  return MODULE_IDS.REWRITE_MESSAGE;
}

function buildRecommendedAction(moduleId: ModuleId): string {
  switch (moduleId) {
    case MODULE_IDS.CONFLICT_CHECK:
      return "Run conflict check before sending to review escalation signals and safer next steps.";
    case MODULE_IDS.REWRITE_MESSAGE:
      return "Generate calm, neutral, and boundary-safe drafts before sending.";
    case MODULE_IDS.SUPPORT_DISCOVERY:
      return "Open support discovery to surface crisis and community resources with safety gating.";
    default:
      return "Review intent routing output and choose the next module.";
  }
}

function buildFollowupQuestions(
  moduleId: ModuleId,
  safetyFlags: IntentRouteResponse["safety_flags"],
): string[] {
  const hasCrisisFlag = safetyFlags.some((flag) =>
    ["immediate_danger", "domestic_violence_risk", "self_harm_risk"].includes(flag),
  );

  if (moduleId === MODULE_IDS.SUPPORT_DISCOVERY) {
    return hasCrisisFlag
      ? ["Are you in immediate danger right now?", "What location should we prioritize for support?"]
      : ["What location should we search in first?", "Do you want crisis, legal, or general family support resources?"];
  }

  if (moduleId === MODULE_IDS.CONFLICT_CHECK) {
    return [
      "Is this message about schedule, expenses, boundaries, or another trigger?",
      "Do you want a do-not-say list before sending?",
    ];
  }

  return [
    "Do you want this to sound more calm, neutral, or firm?",
    "Should we tailor wording to your style and your co-parent's style?",
  ];
}

function buildSuggestedCards(moduleId: ModuleId): IntentRouteResponse["suggested_cards"] {
  if (moduleId === MODULE_IDS.SUPPORT_DISCOVERY) {
    return [
      {
        module_id: MODULE_IDS.SUPPORT_DISCOVERY,
        title: "Find Support",
        reason: "Best fit when safety or urgent support is in scope.",
      },
      {
        module_id: MODULE_IDS.CONFLICT_CHECK,
        title: "Conflict Snapshot",
        reason: "Quickly assess escalation level before outreach.",
      },
    ];
  }

  if (moduleId === MODULE_IDS.CONFLICT_CHECK) {
    return [
      {
        module_id: MODULE_IDS.CONFLICT_CHECK,
        title: "Conflict Check",
        reason: "Analyze risk signals and safer next actions.",
      },
      {
        module_id: MODULE_IDS.REWRITE_MESSAGE,
        title: "Rewrite Message",
        reason: "Convert high-friction language into constructive alternatives.",
      },
    ];
  }

  return [
    {
      module_id: MODULE_IDS.REWRITE_MESSAGE,
      title: "Rewrite Message",
      reason: "Prepare safer language before sending.",
    },
    {
      module_id: MODULE_IDS.CONFLICT_CHECK,
      title: "Conflict Check",
      reason: "Validate risk level and safety flags before final send.",
    },
  ];
}

export async function routeIntent(
  input: IntentRouteRequest,
  deps: IntentRouterDependencies = {},
): Promise<IntentRouteResponse> {
  const analyzeConflictFn = deps.analyzeConflictFn ?? analyzeConflict;
  const conversationHistory = input.context?.conversation_history;
  const offTopic = isOffTopicRequest(input.text);

  const conflictAnalysis = await analyzeConflictFn(input.text, conversationHistory);
  let conflictLevel = mapSeverityToConflictLevel(conflictAnalysis);
  const safetyFlags = detectSafetyFlagsFromText(input.text, {
    conflictLevel,
    isOffTopic: offTopic.isOffTopic,
  });

  if (hasCrisisSafetyFlag(safetyFlags)) {
    conflictLevel = 4;
  }

  const moduleId = pickModuleId(input.text, conflictLevel, safetyFlags);

  return {
    module_id: moduleId,
    conflict_level: conflictLevel,
    safety_flags: safetyFlags,
    recommended_action: buildRecommendedAction(moduleId),
    followup_questions: buildFollowupQuestions(moduleId, safetyFlags),
    suggested_cards: buildSuggestedCards(moduleId),
  };
}
