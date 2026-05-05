import { describe, expect, it, vi } from "vitest";
import { createConflictCheckModuleRoute } from "../../../server/v2/modules/conflictCheck";
import { createRewriteMessageModuleRoute } from "../../../server/v2/modules/rewriteMessage";
import { createSupportDiscoveryModuleRoute } from "../../../server/v2/modules/supportDiscovery";
import { MODULE_IDS } from "../../../server/v2/registry/moduleRegistry";
import { createIntentRoute } from "../../../server/v2/router/intentRoute";
import { createConversationRoute } from "../../../server/v2/routes/conversation";
import { createV2Router } from "../../../server/v2/routes/index";

vi.mock("../../../server/db", () => ({
  pool: {
    query: vi.fn(async () => ({ rows: [{ ok: 1 }] })),
  },
  db: {},
}));

vi.mock("../../../server/v2/services/moduleRunTracker", () => ({
  withModuleRunTracking: vi.fn(async (_ctx: unknown, handler: () => Promise<unknown>) => handler()),
}));

const requiredTopLevelKeys = [
  "session",
  "intent",
  "ui",
  "analysis",
  "actions",
  "explain",
  "safety",
  "errors",
] as const;

function createMockRes() {
  const result: {
    statusCode: number;
    body: any;
    status: (code: number) => any;
    json: (payload: unknown) => any;
  } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return result;
}

async function invokeRoute(
  router: ReturnType<typeof createIntentRoute>,
  method: "get" | "post",
  path: string,
  body?: unknown,
) {
  const layer = router.stack.find(
    (candidate: any) => candidate.route?.path === path && candidate.route?.methods?.[method],
  );
  if (!layer?.route?.stack?.[0]?.handle) {
    throw new Error(`Route handler not found for ${method.toUpperCase()} ${path}`);
  }

  const req = {
    body,
    method: method.toUpperCase(),
    url: path,
    headers: {},
  } as any;
  const res = createMockRes();
  await layer.route.stack[0].handle(req, res);
  return { status: res.statusCode, json: res.body };
}

function assertEnvelopeShape(payload: any) {
  expect(payload?.ui?.version).toBe(1);
  for (const key of requiredTopLevelKeys) {
    expect(payload).toHaveProperty(key);
  }
}

describe("v2 canonical response envelope contract", () => {
  it("every v2 endpoint returns ui.version=1 and required top-level keys", async () => {
    const healthRouter = createV2Router({
      getDatabaseDependencyCheckFn: async () => ({
        reachable: true,
        checked_at: new Date().toISOString(),
      }),
      conversationRouteDeps: {
        orchestratorDeps: {
          resolveSessionFn: async (input) => ({
            sessionId: input.sessionId ?? "0adfdb24-7ef2-4f43-a347-4fe0dabf8ecb",
            isNew: !input.sessionId,
            userId: input.userId,
          }),
          hasHistoryFn: async () => false,
          loadRecentMessagesFn: async () => [],
          persistMessageFn: async () => undefined,
          routeIntentFn: async () => ({
            module_id: MODULE_IDS.REWRITE_MESSAGE,
            conflict_level: 1,
            safety_flags: [],
            recommended_action: "Use rewrite flow.",
            followup_questions: ["Do you want calm tone?"],
            suggested_cards: [],
          }),
          runConflictCheckFn: async () => ({
            conflict_level: 1,
            signals: [],
            safety_flags: [],
            recommended_next_actions: ["Keep the tone factual."],
            do_not_say: [],
          }),
          runRewriteMessageFn: async () => ({
            rewritten_calm: "Could we agree on the plan?",
            rewritten_neutral: "Please confirm the plan.",
            rewritten_boundary: "I will continue once this stays respectful.",
            conflict_level: 1,
            safety_flags: [],
            notes: ["Low conflict rewrite generated."],
          }),
          runSupportDiscoveryFn: async () => ({
            ranked_resources: [],
          }),
          trackRunFn: async (_ctx, handler) => handler(),
        },
      },
      intentRouteDeps: {
        routeIntentFn: async () => ({
          module_id: MODULE_IDS.REWRITE_MESSAGE,
          conflict_level: 2,
          safety_flags: ["high_conflict"],
          recommended_action: "Use rewrite module first.",
          followup_questions: ["Do you want calm or neutral tone?"],
          suggested_cards: [],
        }),
        trackRunFn: async (_ctx, handler) => handler(),
      },
      conflictRouteDeps: {
        runConflictCheckFn: async () => ({
          conflict_level: 2,
          signals: [
            {
              type: "linguistic",
              key: "pressure_control",
              description: "Demand language detected.",
              weight: 8,
            },
          ],
          safety_flags: ["high_conflict"],
          recommended_next_actions: ["Use a calm rewrite."],
          do_not_say: ["You always do this."],
        }),
        trackRunFn: async (_ctx, handler) => handler(),
      },
      rewriteRouteDeps: {
        runRewriteMessageFn: async () => ({
          rewritten_calm: "Could we align on pickup timing for tomorrow?",
          rewritten_neutral: "Please confirm pickup timing for tomorrow.",
          rewritten_boundary: "I will continue once we can keep this respectful.",
          conflict_level: 2,
          safety_flags: ["high_conflict"],
          notes: ["Tone adjusted for de-escalation."],
        }),
        trackRunFn: async (_ctx, handler) => handler(),
      },
      supportRouteDeps: {
        runSupportDiscoveryFn: async () => ({
          ranked_resources: [
            {
              title: "211 Ontario",
              type: "support",
              location: "Ontario",
              url: "https://211ontario.ca/",
              disclaimer: "Resource information is guidance only.",
            },
          ],
        }),
        trackRunFn: async (_ctx, handler) => handler(),
      },
    });

    const intentRouter = createIntentRoute({
      routeIntentFn: async () => ({
        module_id: MODULE_IDS.REWRITE_MESSAGE,
        conflict_level: 2,
        safety_flags: ["high_conflict"],
        recommended_action: "Use rewrite module first.",
        followup_questions: ["Do you want calm or neutral tone?"],
        suggested_cards: [],
      }),
      trackRunFn: async (_ctx, handler) => handler(),
    });

    const conflictRouter = createConflictCheckModuleRoute({
      runConflictCheckFn: async () => ({
        conflict_level: 2,
        signals: [
          {
            type: "linguistic",
            key: "pressure_control",
            description: "Demand language detected.",
            weight: 8,
          },
        ],
        safety_flags: ["high_conflict"],
        recommended_next_actions: ["Use a calm rewrite."],
        do_not_say: ["You always do this."],
      }),
      trackRunFn: async (_ctx, handler) => handler(),
    });

    const rewriteRouter = createRewriteMessageModuleRoute({
      runRewriteMessageFn: async () => ({
        rewritten_calm: "Could we align on pickup timing for tomorrow?",
        rewritten_neutral: "Please confirm pickup timing for tomorrow.",
        rewritten_boundary: "I will continue once we can keep this respectful.",
        conflict_level: 2,
        safety_flags: ["high_conflict"],
        notes: ["Tone adjusted for de-escalation."],
      }),
      trackRunFn: async (_ctx, handler) => handler(),
    });

    const supportRouter = createSupportDiscoveryModuleRoute({
      runSupportDiscoveryFn: async () => ({
        ranked_resources: [
          {
            title: "211 Ontario",
            type: "support",
            location: "Ontario",
            url: "https://211ontario.ca/",
            disclaimer: "Resource information is guidance only.",
          },
        ],
      }),
      trackRunFn: async (_ctx, handler) => handler(),
    });

    const conversationRouter = createConversationRoute({
      orchestratorDeps: {
        resolveSessionFn: async (input) => ({
          sessionId: input.sessionId ?? "0adfdb24-7ef2-4f43-a347-4fe0dabf8ecb",
          isNew: !input.sessionId,
          userId: input.userId,
        }),
        hasHistoryFn: async () => false,
        loadRecentMessagesFn: async () => [],
        persistMessageFn: async () => undefined,
        routeIntentFn: async () => ({
          module_id: MODULE_IDS.REWRITE_MESSAGE,
          conflict_level: 1,
          safety_flags: [],
          recommended_action: "Use rewrite flow.",
          followup_questions: ["Do you want calm tone?"],
          suggested_cards: [],
        }),
        runConflictCheckFn: async () => ({
          conflict_level: 1,
          signals: [],
          safety_flags: [],
          recommended_next_actions: ["Keep the tone factual."],
          do_not_say: [],
        }),
        runRewriteMessageFn: async () => ({
          rewritten_calm: "Could we agree on the plan?",
          rewritten_neutral: "Please confirm the plan.",
          rewritten_boundary: "I will continue once this stays respectful.",
          conflict_level: 1,
          safety_flags: [],
          notes: ["Low conflict rewrite generated."],
        }),
        runSupportDiscoveryFn: async () => ({
          ranked_resources: [],
        }),
        trackRunFn: async (_ctx, handler) => handler(),
      },
    });

    const health = await invokeRoute(healthRouter as any, "get", "/health");
    const intent = await invokeRoute(intentRouter, "post", "/intent", {
      text: "help me route this",
    });
    const conflict = await invokeRoute(conflictRouter as any, "post", "/conflict-check", {
      text: "you never listen",
    });
    const rewrite = await invokeRoute(rewriteRouter as any, "post", "/rewrite-message", {
      text: "you never listen",
    });
    const support = await invokeRoute(supportRouter as any, "post", "/support-discovery", {
      query: "support",
    });
    const orchestrate = await invokeRoute(
      conversationRouter as any,
      "post",
      "/orchestrate",
      {
        sessionId: null,
        user: { userId: null, locale: "en-CA", tz: "America/Toronto" },
        mode: "task",
        message: { text: "Need help responding", source: "typed" },
        userChoice: null,
        contextHints: { coparentTone: null, userTone: null },
        debug: false,
      },
    );

    for (const response of [health, intent, conflict, rewrite, support, orchestrate]) {
      expect(response.status).toBe(200);
      assertEnvelopeShape(response.json);
    }
  });
});
