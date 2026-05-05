import { Router } from "express";
import { MODULE_IDS } from "../registry/moduleRegistry";
import { routeIntent } from "./intentRouter";
import { intentRouteRequestSchema, intentRouteResponseSchema } from "../schemas/intent";
import { withModuleRunTracking } from "../services/moduleRunTracker";
import {
  buildMediumHighConflictActions,
  buildV2Envelope,
  buildV2ErrorEnvelope,
  conflictChip,
  conflictScoreToLevel,
  legacyConflictLevelToScore,
} from "../services/envelope";
import { hasCrisisSafetyFlag } from "../services/safetySignals";

interface IntentRouteDependencies {
  routeIntentFn?: typeof routeIntent;
  trackRunFn?: typeof withModuleRunTracking;
}

export function createIntentRoute(deps: IntentRouteDependencies = {}): Router {
  const router = Router();
  const routeIntentFn = deps.routeIntentFn ?? routeIntent;
  const trackRunFn = deps.trackRunFn ?? withModuleRunTracking;

  router.post("/intent", async (req, res) => {
    const parsedRequest = intentRouteRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json(
        buildV2ErrorEnvelope({
          code: "INVALID_REQUEST",
          message: "Invalid request body",
          data: {
            zod: parsedRequest.error.flatten(),
          },
        }),
      );
    }

    try {
      const response = await trackRunFn(
        {
          moduleId: MODULE_IDS.ROUTER_INTENT,
          input: parsedRequest.data,
          userId: parsedRequest.data.context?.user_id,
          sessionId: parsedRequest.data.context?.session_id,
        },
        () => routeIntentFn(parsedRequest.data),
      );
      const parsedResponse = intentRouteResponseSchema.parse(response);
      const conflictScore = legacyConflictLevelToScore(parsedResponse.conflict_level);
      const conflictLevel = conflictScoreToLevel(conflictScore);
      const crisis = hasCrisisSafetyFlag(parsedResponse.safety_flags);

      return res.status(200).json(
        buildV2Envelope({
          ok: true,
          session: {
            sessionId: parsedRequest.data.context?.session_id ?? null,
            isNew: false,
            userId: parsedRequest.data.context?.user_id ?? null,
          },
          intent: {
            id: parsedResponse.module_id,
            confidence: 0.72,
            source: "router",
          },
          analysis: {
            conflict: {
              score: conflictScore,
              level: conflictLevel,
              source: parsedRequest.data.context?.conversation_history?.length
                ? "history_assisted"
                : "message_only",
              signals: parsedResponse.followup_questions,
            },
          },
          safety: {
            safeToProceed: !crisis,
            flags: parsedResponse.safety_flags,
            handoff: {
              type: crisis ? "support" : "none",
              reason: crisis ? "crisis_signal_detected" : null,
            },
          },
          explain: {
            summary: parsedResponse.recommended_action,
            reasons: parsedResponse.followup_questions.slice(0, 3),
          },
          actions:
            conflictLevel === "medium" || conflictLevel === "high"
              ? buildMediumHighConflictActions()
              : [
                  {
                    id: "run_selected_module",
                    label: "Run Suggested Module",
                    type: "run_module",
                    payload: {
                      moduleId: parsedResponse.module_id,
                    },
                  },
                ],
          ui: {
            chips: [conflictChip(conflictLevel)],
            cards: parsedResponse.suggested_cards.map((card) => ({
              id: card.module_id,
              title: card.title,
              reason: card.reason,
              moduleId: card.module_id,
            })),
          },
          data: parsedResponse,
          errors: [],
        }),
      );
    } catch (error) {
      console.error("[v2][intent] Failed to route intent", error);
      return res.status(500).json(
        buildV2ErrorEnvelope({
          session: {
            sessionId: parsedRequest.data.context?.session_id ?? null,
            isNew: false,
            userId: parsedRequest.data.context?.user_id ?? null,
          },
          intent: {
            id: MODULE_IDS.ROUTER_INTENT,
            confidence: null,
            source: "router",
          },
          code: "INTENT_ROUTING_FAILED",
          message: "Failed to route intent",
        }),
      );
    }
  });

  return router;
}
