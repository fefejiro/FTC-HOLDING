import { Router } from "express";
import { MODULE_IDS } from "../registry/moduleRegistry";
import { runConflictCheck } from "../services/conflictService";
import {
  conflictCheckRequestSchema,
  conflictCheckResponseSchema,
} from "../schemas/conflictCheck";
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

interface ConflictCheckRouteDependencies {
  runConflictCheckFn?: typeof runConflictCheck;
  trackRunFn?: typeof withModuleRunTracking;
}

export function createConflictCheckModuleRoute(
  deps: ConflictCheckRouteDependencies = {},
): Router {
  const router = Router();
  const runConflictCheckFn = deps.runConflictCheckFn ?? runConflictCheck;
  const trackRunFn = deps.trackRunFn ?? withModuleRunTracking;

  router.post("/conflict-check", async (req, res) => {
    const parsedRequest = conflictCheckRequestSchema.safeParse(req.body);
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
      const result = await trackRunFn(
        {
          moduleId: MODULE_IDS.CONFLICT_CHECK,
          input: parsedRequest.data,
          userId: parsedRequest.data.context?.user_id,
          sessionId: parsedRequest.data.context?.session_id,
        },
        () => runConflictCheckFn(parsedRequest.data),
      );
      const response = conflictCheckResponseSchema.parse(result);
      const conflictScore = legacyConflictLevelToScore(response.conflict_level);
      const conflictLevel = conflictScoreToLevel(conflictScore);
      const crisis = hasCrisisSafetyFlag(response.safety_flags);

      return res.status(200).json(
        buildV2Envelope({
          ok: true,
          session: {
            sessionId: parsedRequest.data.context?.session_id ?? null,
            isNew: false,
            userId: parsedRequest.data.context?.user_id ?? null,
          },
          intent: {
            id: MODULE_IDS.CONFLICT_CHECK,
            confidence: 1,
            source: "unknown",
          },
          analysis: {
            conflict: {
              score: conflictScore,
              level: conflictLevel,
              source: parsedRequest.data.conversation_history?.length
                ? "history_assisted"
                : "message_only",
              signals: response.signals.map((signal) => signal.description),
            },
          },
          safety: {
            safeToProceed: !crisis,
            flags: response.safety_flags,
            handoff: {
              type: crisis ? "support" : "none",
              reason: crisis ? "crisis_signal_detected" : null,
            },
          },
          explain: {
            summary:
              conflictLevel === "high"
                ? "High escalation risk detected. De-escalation and support-first steps are recommended."
                : "Conflict analysis complete with recommended next actions.",
            reasons: response.recommended_next_actions.slice(0, 3),
          },
          actions:
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
                ],
          ui: {
            chips: [conflictChip(conflictLevel)],
            cards: response.recommended_next_actions.slice(0, 3).map((item, index) => ({
              id: `next_action_${index + 1}`,
              title: "Recommended Next Step",
              body: item,
            })),
          },
          data: response,
          errors: [],
        }),
      );
    } catch (error) {
      console.error("[v2][conflict-check] Failed to run module", error);
      return res.status(500).json(
        buildV2ErrorEnvelope({
          session: {
            sessionId: parsedRequest.data.context?.session_id ?? null,
            isNew: false,
            userId: parsedRequest.data.context?.user_id ?? null,
          },
          intent: {
            id: MODULE_IDS.CONFLICT_CHECK,
            confidence: 1,
            source: "unknown",
          },
          code: "CONFLICT_CHECK_FAILED",
          message: "Failed to run conflict check",
        }),
      );
    }
  });

  return router;
}
