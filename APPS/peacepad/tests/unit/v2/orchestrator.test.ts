import { describe, expect, it, vi } from "vitest";
import { MODULE_IDS } from "../../../server/v2/registry/moduleRegistry";
import { orchestrateConversation } from "../../../server/v2/services/orchestratorService";

vi.mock("../../../server/v2/services/conversationStore", () => ({
  resolveConversationSession: vi.fn(async () => ({
    sessionId: "11111111-1111-4111-8111-111111111111",
    isNew: true,
    userId: "user-1",
  })),
  hasConversationHistory: vi.fn(async () => false),
  loadRecentConversationMessages: vi.fn(async () => []),
  persistConversationMessage: vi.fn(async () => undefined),
}));

vi.mock("../../../server/v2/services/moduleRunTracker", () => ({
  withModuleRunTracking: vi.fn(async (_ctx: unknown, handler: () => Promise<unknown>) => handler()),
}));

const baseRequest = {
  sessionId: null,
  user: {
    userId: "user-1",
    locale: "en-CA",
    tz: "America/Toronto",
  },
  mode: "task" as const,
  message: {
    text: "Can you help me reply calmly?",
    source: "typed" as const,
  },
  userChoice: null,
  contextHints: {
    coparentTone: "direct",
    userTone: "gentle",
  },
  debug: false,
};

function createDeps(overrides: Record<string, unknown> = {}) {
  return {
    resolveSessionFn: vi.fn(async (input: { sessionId: string | null; userId: string | null }) => ({
      sessionId: input.sessionId ?? "11111111-1111-4111-8111-111111111111",
      isNew: !input.sessionId,
      userId: input.userId,
    })),
    hasHistoryFn: vi.fn(async () => false),
    loadRecentMessagesFn: vi.fn(async () => []),
    persistMessageFn: vi.fn(async () => undefined),
    routeIntentFn: vi.fn(async () => ({
      module_id: MODULE_IDS.REWRITE_MESSAGE,
      conflict_level: 2,
      safety_flags: ["high_conflict"],
      recommended_action: "Use rewrite message flow.",
      followup_questions: ["Do you want this to be calm or neutral?"],
      suggested_cards: [],
    })),
    runConflictCheckFn: vi.fn(async () => ({
      conflict_level: 2,
      signals: [
        {
          type: "linguistic",
          key: "pressure_control",
          description: "Pressure language detected.",
          weight: 8,
        },
      ],
      safety_flags: ["high_conflict"],
      recommended_next_actions: ["Use a calmer rewrite."],
      do_not_say: ["You always do this."],
    })),
    runRewriteMessageFn: vi.fn(async () => ({
      rewritten_calm: "Could we agree on the pickup timing for tomorrow?",
      rewritten_neutral: "Please confirm pickup timing for tomorrow.",
      rewritten_boundary: "I will continue this when we can keep it respectful.",
      conflict_level: 2,
      safety_flags: ["high_conflict"],
      notes: ["Tone softened."],
    })),
    runSupportDiscoveryFn: vi.fn(async () => ({
      ranked_resources: [
        {
          title: "211 Ontario",
          type: "support",
          location: "Ontario",
          url: "https://211ontario.ca/",
          disclaimer: "Resource information is guidance only.",
        },
      ],
    })),
    trackRunFn: vi.fn(async (_ctx: unknown, handler: () => Promise<unknown>) => handler()),
    ...overrides,
  };
}

describe("v2 orchestrator", () => {
  it("creates a new session when sessionId is null", async () => {
    const deps = createDeps();
    const result = await orchestrateConversation(baseRequest, deps);
    expect(result.session.isNew).toBe(true);
    expect(result.session.sessionId).toBeTruthy();
  });

  it("reuses a session when sessionId is provided", async () => {
    const deps = createDeps({
      resolveSessionFn: vi.fn(async () => ({
        sessionId: "22222222-2222-4222-8222-222222222222",
        isNew: false,
        userId: "user-1",
      })),
    });

    const result = await orchestrateConversation(
      {
        ...baseRequest,
        sessionId: "22222222-2222-4222-8222-222222222222",
      },
      deps,
    );
    expect(result.session.isNew).toBe(false);
    expect(result.session.sessionId).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("uses router when userChoice is null", async () => {
    const deps = createDeps();
    await orchestrateConversation(baseRequest, deps);
    expect(deps.routeIntentFn).toHaveBeenCalledTimes(1);
  });

  it("respects userChoice when provided", async () => {
    const deps = createDeps();
    const result = await orchestrateConversation(
      {
        ...baseRequest,
        userChoice: {
          moduleId: MODULE_IDS.SUPPORT_DISCOVERY,
        },
      },
      deps,
    );

    expect(deps.routeIntentFn).not.toHaveBeenCalled();
    expect(result.intent.source).toBe("user_choice");
    expect(result.intent.id).toBe(MODULE_IDS.SUPPORT_DISCOVERY);
  });

  it('uses conflict.source "message_only" when no history exists', async () => {
    const deps = createDeps({
      hasHistoryFn: vi.fn(async () => false),
    });
    const result = await orchestrateConversation(baseRequest, deps);
    expect(result.analysis.conflict.source).toBe("message_only");
  });

  it('uses conflict.source "history_assisted" when history exists', async () => {
    const deps = createDeps({
      hasHistoryFn: vi.fn(async () => true),
      loadRecentMessagesFn: vi.fn(async () => [
        "We argued about pickup times yesterday.",
        "This pattern has repeated every weekend.",
      ]),
    });
    const result = await orchestrateConversation(baseRequest, deps);
    expect(result.analysis.conflict.source).toBe("history_assisted");
  });

  it("safety gating blocks rewrite and returns support handoff", async () => {
    const deps = createDeps({
      runConflictCheckFn: vi.fn(async () => ({
        conflict_level: 4,
        signals: [
          {
            type: "pattern",
            key: "crisis",
            description: "Crisis signal detected.",
            weight: 16,
          },
        ],
        safety_flags: ["self_harm_risk", "immediate_danger"],
        recommended_next_actions: ["Prioritize support now."],
        do_not_say: [],
      })),
    });

    const result = await orchestrateConversation(baseRequest, deps);
    expect(result.safety.safeToProceed).toBe(false);
    expect(result.safety.handoff.type).toBe("support");
    expect(deps.runRewriteMessageFn).not.toHaveBeenCalled();
    expect(deps.runSupportDiscoveryFn).toHaveBeenCalledTimes(1);
  });
});
