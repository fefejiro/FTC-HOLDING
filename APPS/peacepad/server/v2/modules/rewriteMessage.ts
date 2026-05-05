import { Router } from "express";
import { MODULE_IDS } from "../registry/moduleRegistry";
import { runRewriteMessage } from "../services/rewriteService";
import {
  rewriteMessageRequestSchema,
  rewriteMessageResponseSchema,
} from "../schemas/rewriteMessage";
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

interface RewriteRouteDependencies {
  runRewriteMessageFn?: typeof runRewriteMessage;
  trackRunFn?: typeof withModuleRunTracking;
}

export function createRewriteMessageModuleRoute(deps: RewriteRouteDependencies = {}): Router {
  const router = Router();
  const runRewriteMessageFn = deps.runRewriteMessageFn ?? runRewriteMessage;
  const trackRunFn = deps.trackRunFn ?? withModuleRunTracking;

  router.post("/rewrite-message", async (req, res) => {
    const parsedRequest = rewriteMessageRequestSchema.safeParse(req.body);
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
          moduleId: MODULE_IDS.REWRITE_MESSAGE,
          input: parsedRequest.data,
          userId: parsedRequest.data.context?.user_id,
          sessionId: parsedRequest.data.context?.session_id,
        },
        () => runRewriteMessageFn(parsedRequest.data),
      );
      const response = rewriteMessageResponseSchema.parse(result);
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
            id: MODULE_IDS.REWRITE_MESSAGE,
            confidence: 1,
            source: "unknown",
          },
          analysis: {
            conflict: {
              score: conflictScore,
              level: conflictLevel,
              source: "message_only",
              signals: response.notes,
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
            summary: "Generated calm, neutral, and boundary-safe rewrite options.",
            reasons: response.notes.slice(0, 3),
          },
          actions:
            conflictLevel === "medium" || conflictLevel === "high"
              ? buildMediumHighConflictActions(response.rewritten_calm)
              : [
                  {
                    id: "send_calm_response",
                    label: "Copy Calm Draft",
                    type: "copy",
                    payload: {
                      text: response.rewritten_calm,
                    },
                  },
                ],
          ui: {
            chips: [conflictChip(conflictLevel)],
            cards: [
              {
                id: "rewrite_calm",
                title: "Calm",
                body: response.rewritten_calm,
              },
              {
                id: "rewrite_neutral",
                title: "Neutral",
                body: response.rewritten_neutral,
              },
              {
                id: "rewrite_boundary",
                title: "Boundary",
                body: response.rewritten_boundary,
              },
            ],
          },
          data: response,
          errors: [],
        }),
      );
    } catch (error) {
      console.error("[v2][rewrite-message] Failed to run module", error);
      return res.status(500).json(
        buildV2ErrorEnvelope({
          session: {
            sessionId: parsedRequest.data.context?.session_id ?? null,
            isNew: false,
            userId: parsedRequest.data.context?.user_id ?? null,
          },
          intent: {
            id: MODULE_IDS.REWRITE_MESSAGE,
            confidence: 1,
            source: "unknown",
          },
          code: "REWRITE_MESSAGE_FAILED",
          message: "Failed to rewrite message",
        }),
      );
    }
  });

  return router;
}
