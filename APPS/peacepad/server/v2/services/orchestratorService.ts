import { MODULE_IDS, isValidModuleId } from "../registry/moduleRegistry";
import type { ConflictCheckResponse } from "../schemas/conflictCheck";
import type { IntentRouteResponse } from "../schemas/intent";
import type { OrchestrateRequest } from "../schemas/orchestrate";
import type { RewriteMessageResponse } from "../schemas/rewriteMessage";
import type { SupportDiscoveryResponse } from "../schemas/supportDiscovery";
import {
  buildMediumHighConflictActions,
  buildSafetyActions,
  buildV2Envelope,
  clampScore,
  conflictScoreToLevel,
  legacyConflictLevelToScore,
} from "./envelope";
import { scoreConflictFallback } from "./deterministicFallback";
import { routeIntent } from "../router/intentRouter";
import { runConflictCheck } from "./conflictService";
import { runRewriteMessage } from "./rewriteService";
import { runSupportDiscovery } from "./supportDiscoveryService";
import { hasCrisisSafetyFlag } from "./safetySignals";
import {
  hasConversationHistory,
  loadRecentConversationMessages,
  persistConversationMessage,
  resolveConversationSession,
  type ResolvedConversationSession,
} from "./conversationStore";
import { withModuleRunTracking } from "./moduleRunTracker";
import type { ModuleId } from "../registry/moduleRegistry";
import type { V2ResponseEnvelope } from "../schemas/envelope";

type RouteIntentFn = typeof routeIntent;
type RunConflictCheckFn = typeof runConflictCheck;
type RunRewriteMessageFn = typeof runRewriteMessage;
type RunSupportDiscoveryFn = typeof runSupportDiscovery;
type TrackRunFn = typeof withModuleRunTracking;

export interface ConversationOrchestratorDependencies {
  resolveSessionFn?: (input: { sessionId: string | null; userId: string | null }) => Promise<ResolvedConversationSession>;
  hasHistoryFn?: (sessionId: string) => Promise<boolean>;
  loadRecentMessagesFn?: (sessionId: string, limit?: number) => Promise<string[]>;
  persistMessageFn?: (input: {
    sessionId: string;
    role: "user" | "assistant";
    text: string;
    mode: "narration" | "task";
    intentId?: string | null;
  }) => Promise<void>;
  routeIntentFn?: RouteIntentFn;
  runConflictCheckFn?: RunConflictCheckFn;
  runRewriteMessageFn?: RunRewriteMessageFn;
  runSupportDiscoveryFn?: RunSupportDiscoveryFn;
  trackRunFn?: TrackRunFn;
}

function normalizeIntentChoice(moduleId: string | undefined | null): ModuleId | null {
  if (!moduleId || !isValidModuleId(moduleId)) {
    return null;
  }
  return moduleId;
}

function conflictSignals(result: ConflictCheckResponse): string[] {
  return result.signals.map((signal) => signal.description).slice(0, 8);
}

function buildClarifyingCards(): unknown[] {
  return [
    {
      id: "clarify_rewrite",
      title: "Rewrite a Message",
      body: "Turn your draft into calm, neutral, and boundary-safe options.",
      moduleId: MODULE_IDS.REWRITE_MESSAGE,
    },
    {
      id: "clarify_conflict",
      title: "Conflict Snapshot",
      body: "Check escalation risk and identify safer next steps.",
      moduleId: MODULE_IDS.CONFLICT_CHECK,
    },
    {
      id: "clarify_support",
      title: "Find Support",
      body: "Locate crisis and community resources when safety needs are high.",
      moduleId: MODULE_IDS.SUPPORT_DISCOVERY,
    },
  ];
}

function explainFromConflict(level: "low" | "medium" | "high", safeToProceed: boolean) {
  if (!safeToProceed) {
    return {
      summary: "Safety signals indicate support should be prioritized before further drafting.",
      reasons: [
        "High-risk safety language was detected in the latest message.",
        "The assistant paused rewrite generation until support pathways are available.",
      ],
    };
  }

  if (level === "high") {
    return {
      summary: "The message shows high escalation risk and needs de-escalation before sending.",
      reasons: [
        "Conflict signals indicate elevated tension or threat framing.",
        "A calm draft and support options were prioritized.",
      ],
    };
  }

  if (level === "medium") {
    return {
      summary: "The message shows moderate escalation risk; a neutral or calm rewrite is recommended.",
      reasons: [
        "Some language patterns increase defensiveness.",
        "A safer tone can reduce back-and-forth escalation.",
      ],
    };
  }

  return {
    summary: "The message appears low conflict and safe to proceed.",
    reasons: ["No immediate crisis signals were detected."],
  };
}

function fallbackConflictResult(text: string): ConflictCheckResponse {
  const fallback = scoreConflictFallback(text);
  const level = fallback.level === "high" ? 3 : fallback.level === "medium" ? 2 : fallback.score > 0 ? 1 : 0;
  return {
    conflict_level: level,
    signals: fallback.signals.map((signal) => ({
      type: "pattern",
      key: signal,
      description: `Fallback signal: ${signal.replace(/_/g, " ")}`,
      weight: 8,
    })),
    safety_flags: [],
    recommended_next_actions: [
      "Pause briefly and keep language specific.",
      "Avoid blame, insults, or legal threats.",
    ],
    do_not_say: [],
  };
}

export async function orchestrateConversation(
  request: OrchestrateRequest,
  deps: ConversationOrchestratorDependencies = {},
): Promise<V2ResponseEnvelope> {
  const resolveSessionFn = deps.resolveSessionFn ?? resolveConversationSession;
  const hasHistoryFn = deps.hasHistoryFn ?? hasConversationHistory;
  const loadRecentMessagesFn = deps.loadRecentMessagesFn ?? loadRecentConversationMessages;
  const persistMessageFn = deps.persistMessageFn ?? persistConversationMessage;
  const routeIntentFn = deps.routeIntentFn ?? routeIntent;
  const runConflictCheckFn = deps.runConflictCheckFn ?? runConflictCheck;
  const runRewriteMessageFn = deps.runRewriteMessageFn ?? runRewriteMessage;
  const runSupportDiscoveryFn = deps.runSupportDiscoveryFn ?? runSupportDiscovery;
  const trackRunFn = deps.trackRunFn ?? withModuleRunTracking;
  const userId = request.user?.userId ?? null;

  const session = await resolveSessionFn({
    sessionId: request.sessionId,
    userId,
  });

  const hadHistory = await hasHistoryFn(session.sessionId);
  const recentMessages = hadHistory ? await loadRecentMessagesFn(session.sessionId, 6) : [];

  await persistMessageFn({
    sessionId: session.sessionId,
    role: "user",
    text: request.message.text,
    mode: request.mode,
  });

  const userChoiceModule = normalizeIntentChoice(request.userChoice?.moduleId);

  let routedIntent: IntentRouteResponse | null = null;
  let selectedModuleId: ModuleId | null = userChoiceModule;
  let intentSource: V2ResponseEnvelope["intent"]["source"] = userChoiceModule ? "user_choice" : "unknown";
  let intentConfidence: number | null = userChoiceModule ? 1 : null;

  if (!selectedModuleId) {
    routedIntent = await trackRunFn(
      {
        moduleId: MODULE_IDS.ROUTER_INTENT,
        input: request,
        userId: userId ?? undefined,
        sessionId: session.sessionId,
      },
      () =>
        routeIntentFn({
          text: request.message.text,
          user_style: request.contextHints?.userTone ?? undefined,
          coparent_style: request.contextHints?.coparentTone ?? undefined,
          context: {
            conversation_history: hadHistory ? recentMessages : undefined,
            session_id: session.sessionId,
            user_id: userId ?? undefined,
          },
        }),
    );
    selectedModuleId = routedIntent.module_id;
    intentSource = "router";
    intentConfidence = clampScore(0.72);
  }

  let conflictCheckResult: ConflictCheckResponse;
  try {
    conflictCheckResult = await trackRunFn(
      {
        moduleId: MODULE_IDS.CONFLICT_CHECK,
        input: request.message.text,
        userId: userId ?? undefined,
        sessionId: session.sessionId,
      },
      () =>
        runConflictCheckFn({
          text: request.message.text,
          conversation_history: hadHistory ? recentMessages : undefined,
          user_style: request.contextHints?.userTone ?? undefined,
          coparent_style: request.contextHints?.coparentTone ?? undefined,
          context: {
            user_id: userId ?? undefined,
            session_id: session.sessionId,
          },
        }),
    );
  } catch (error) {
    console.warn("[v2][orchestrator] conflict check failed; using deterministic fallback.", error);
    conflictCheckResult = fallbackConflictResult(request.message.text);
  }

  const conflictScore = legacyConflictLevelToScore(conflictCheckResult.conflict_level);
  const conflictLevel = conflictScoreToLevel(conflictScore);
  const safeToProceed = !hasCrisisSafetyFlag(conflictCheckResult.safety_flags);

  let rewriteResult: RewriteMessageResponse | null = null;
  let supportResult: SupportDiscoveryResponse | null = null;
  let cards: unknown[] = [];
  let actions: V2ResponseEnvelope["actions"] = [];
  let explain = explainFromConflict(conflictLevel, safeToProceed);

  if (!safeToProceed) {
    supportResult = await trackRunFn(
      {
        moduleId: MODULE_IDS.SUPPORT_DISCOVERY,
        input: request,
        userId: userId ?? undefined,
        sessionId: session.sessionId,
      },
      () =>
        runSupportDiscoveryFn({
          query: request.message.text.slice(0, 250),
          conflict_level: conflictCheckResult.conflict_level,
          safety_flags: conflictCheckResult.safety_flags,
          context: {
            user_id: userId ?? undefined,
            session_id: session.sessionId,
          },
        }),
    );
    actions = buildSafetyActions(supportResult.ranked_resources[0]?.url);
  } else if (selectedModuleId === MODULE_IDS.REWRITE_MESSAGE) {
    rewriteResult = await trackRunFn(
      {
        moduleId: MODULE_IDS.REWRITE_MESSAGE,
        input: request,
        userId: userId ?? undefined,
        sessionId: session.sessionId,
      },
      () =>
        runRewriteMessageFn({
          text: request.message.text,
          conflict_level: conflictCheckResult.conflict_level,
          user_style: request.contextHints?.userTone ?? undefined,
          coparent_style: request.contextHints?.coparentTone ?? undefined,
          context: {
            user_id: userId ?? undefined,
            session_id: session.sessionId,
          },
        }),
    );

    if (conflictLevel === "medium" || conflictLevel === "high") {
      actions = buildMediumHighConflictActions(rewriteResult.rewritten_calm);
    } else {
      actions = [
        {
          id: "send_calm_response",
          label: "Copy Calm Draft",
          type: "copy",
          payload: {
            text: rewriteResult.rewritten_calm,
          },
        },
        {
          id: "start_new_session",
          label: "Start New Session",
          type: "start_new_session",
          payload: {
            preserveProfile: true,
          },
        },
      ];
    }
  } else if (selectedModuleId === MODULE_IDS.SUPPORT_DISCOVERY) {
    supportResult = await trackRunFn(
      {
        moduleId: MODULE_IDS.SUPPORT_DISCOVERY,
        input: request,
        userId: userId ?? undefined,
        sessionId: session.sessionId,
      },
      () =>
        runSupportDiscoveryFn({
          query: request.message.text.slice(0, 250),
          conflict_level: conflictCheckResult.conflict_level,
          safety_flags: conflictCheckResult.safety_flags,
          context: {
            user_id: userId ?? undefined,
            session_id: session.sessionId,
          },
        }),
    );
    actions = buildSafetyActions(supportResult.ranked_resources[0]?.url);
  } else if (selectedModuleId === MODULE_IDS.CONFLICT_CHECK) {
    actions =
      conflictLevel === "medium" || conflictLevel === "high"
        ? buildMediumHighConflictActions()
        : [
            {
              id: "start_new_session",
              label: "Start New Session",
              type: "start_new_session",
              payload: {
                preserveProfile: true,
              },
            },
          ];
  } else {
    explain = {
      summary: "I need one quick clarification before choosing the best next module.",
      reasons: [
        "Your message could map to rewrite, conflict review, or support discovery.",
        "Choose one of the actions below to continue.",
      ],
    };
    cards = buildClarifyingCards();
    actions = [
      {
        id: "run_rewrite_module",
        label: "Rewrite Message",
        type: "run_module",
        payload: {
          moduleId: MODULE_IDS.REWRITE_MESSAGE,
        },
      },
      {
        id: "run_conflict_check_module",
        label: "Conflict Check",
        type: "run_module",
        payload: {
          moduleId: MODULE_IDS.CONFLICT_CHECK,
        },
      },
      {
        id: "run_support_discovery_module",
        label: "Find Support",
        type: "run_module",
        payload: {
          moduleId: MODULE_IDS.SUPPORT_DISCOVERY,
        },
      },
    ];
  }

  if (session.isNew) {
    cards = [
      ...cards,
      {
        id: "starter_rewrite",
        title: "Start with a calm rewrite",
        body: "Paste a draft and get calm, neutral, and boundary-safe options.",
        moduleId: MODULE_IDS.REWRITE_MESSAGE,
      },
      {
        id: "starter_support",
        title: "Find support resources",
        body: "Discover crisis and community resources based on your needs.",
        moduleId: MODULE_IDS.SUPPORT_DISCOVERY,
      },
    ];
  }

  await persistMessageFn({
    sessionId: session.sessionId,
    role: "assistant",
    text: explain.summary,
    mode: request.mode,
    intentId: selectedModuleId,
  });

  const envelope = buildV2Envelope({
    ok: true,
    session: {
      sessionId: session.sessionId,
      isNew: session.isNew,
      userId: session.userId,
    },
    intent: {
      id: selectedModuleId,
      confidence: intentConfidence,
      source: intentSource,
    },
    analysis: {
      conflict: {
        score: conflictScore,
        level: conflictLevel,
        source: hadHistory ? "history_assisted" : "message_only",
        signals: conflictSignals(conflictCheckResult),
      },
    },
    safety: {
      safeToProceed,
      flags: conflictCheckResult.safety_flags,
      handoff: {
        type: safeToProceed ? "none" : "support",
        reason: safeToProceed ? null : "crisis_signal_detected",
      },
    },
    explain,
    actions,
    ui: {
      cards,
    },
    data: {
      intentRoute: routedIntent,
      conflictCheck: conflictCheckResult,
      rewriteMessage: rewriteResult,
      supportDiscovery: supportResult,
      mode: request.mode,
      messageSource: request.message.source,
      usedHistory: hadHistory,
      ...(request.debug ? { debug: { recentMessages } } : {}),
    },
    errors: [],
  });

  return envelope;
}
