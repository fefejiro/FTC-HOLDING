import { Router } from "express";
import { MODULE_IDS } from "../registry/moduleRegistry";
import { runSupportDiscovery } from "../services/supportDiscoveryService";
import {
  supportDiscoveryRequestSchema,
  supportDiscoveryResponseSchema,
} from "../schemas/supportDiscovery";
import { withModuleRunTracking } from "../services/moduleRunTracker";
import {
  buildSafetyActions,
  buildV2Envelope,
  buildV2ErrorEnvelope,
  conflictChip,
  conflictScoreToLevel,
  legacyConflictLevelToScore,
} from "../services/envelope";
import { hasCrisisSafetyFlag } from "../services/safetySignals";

interface SupportDiscoveryRouteDependencies {
  runSupportDiscoveryFn?: typeof runSupportDiscovery;
  trackRunFn?: typeof withModuleRunTracking;
}

export function createSupportDiscoveryModuleRoute(
  deps: SupportDiscoveryRouteDependencies = {},
): Router {
  const router = Router();
  const runSupportDiscoveryFn = deps.runSupportDiscoveryFn ?? runSupportDiscovery;
  const trackRunFn = deps.trackRunFn ?? withModuleRunTracking;

  router.post("/support-discovery", async (req, res) => {
    const parsedRequest = supportDiscoveryRequestSchema.safeParse(req.body);
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
          moduleId: MODULE_IDS.SUPPORT_DISCOVERY,
          input: parsedRequest.data,
          userId: parsedRequest.data.context?.user_id,
          sessionId: parsedRequest.data.context?.session_id,
        },
        () => runSupportDiscoveryFn(parsedRequest.data),
      );
      const response = supportDiscoveryResponseSchema.parse(result);
      const conflictScore = legacyConflictLevelToScore(parsedRequest.data.conflict_level ?? 0);
      const conflictLevel = conflictScoreToLevel(conflictScore);
      const crisis = hasCrisisSafetyFlag(parsedRequest.data.safety_flags ?? []);

      return res.status(200).json(
        buildV2Envelope({
          ok: true,
          session: {
            sessionId: parsedRequest.data.context?.session_id ?? null,
            isNew: false,
            userId: parsedRequest.data.context?.user_id ?? null,
          },
          intent: {
            id: MODULE_IDS.SUPPORT_DISCOVERY,
            confidence: 1,
            source: "unknown",
          },
          analysis: {
            conflict: {
              score: conflictScore,
              level: conflictLevel,
              source: "message_only",
              signals: parsedRequest.data.safety_flags ?? [],
            },
          },
          safety: {
            safeToProceed: !crisis,
            flags: parsedRequest.data.safety_flags ?? [],
            handoff: {
              type: crisis ? "support" : "none",
              reason: crisis ? "crisis_signal_detected" : null,
            },
          },
          explain: {
            summary: "Ranked support resources are ready.",
            reasons: [
              "Resources are ranked by crisis priority, relevance, and location hints.",
              crisis
                ? "Crisis-mode prioritization is active."
                : "General support ranking is active.",
            ],
          },
          actions: buildSafetyActions(response.ranked_resources[0]?.url),
          ui: {
            chips: [conflictChip(conflictLevel)],
            cards: response.ranked_resources.map((resource, index) => ({
              id: `resource_${index + 1}`,
              title: resource.title,
              subtitle: resource.type,
              location: resource.location,
              url: resource.url,
              phone: resource.phone,
              disclaimer: resource.disclaimer,
            })),
          },
          data: response,
          errors: [],
        }),
      );
    } catch (error) {
      console.error("[v2][support-discovery] Failed to run module", error);
      return res.status(500).json(
        buildV2ErrorEnvelope({
          session: {
            sessionId: parsedRequest.data.context?.session_id ?? null,
            isNew: false,
            userId: parsedRequest.data.context?.user_id ?? null,
          },
          intent: {
            id: MODULE_IDS.SUPPORT_DISCOVERY,
            confidence: 1,
            source: "unknown",
          },
          code: "SUPPORT_DISCOVERY_FAILED",
          message: "Failed to discover support resources",
        }),
      );
    }
  });

  return router;
}
