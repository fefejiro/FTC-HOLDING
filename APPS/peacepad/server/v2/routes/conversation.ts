import { Router } from "express";
import { orchestrateRequestSchema } from "../schemas/orchestrate";
import { buildV2ErrorEnvelope } from "../services/envelope";
import {
  orchestrateConversation,
  type ConversationOrchestratorDependencies,
} from "../services/orchestratorService";

interface ConversationRouteDependencies {
  orchestratorDeps?: ConversationOrchestratorDependencies;
}

export function createConversationRoute(deps: ConversationRouteDependencies = {}): Router {
  const router = Router();

  router.post("/orchestrate", async (req, res) => {
    const parsedRequest = orchestrateRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json(
        buildV2ErrorEnvelope({
          session: {
            sessionId: null,
            isNew: false,
            userId: null,
          },
          code: "INVALID_REQUEST",
          message: "Invalid request body",
          data: {
            zod: parsedRequest.error.flatten(),
          },
        }),
      );
    }

    try {
      const envelope = await orchestrateConversation(parsedRequest.data, deps.orchestratorDeps);
      return res.status(200).json(envelope);
    } catch (error) {
      console.error("[v2][conversation] Failed to orchestrate conversation", error);
      return res.status(500).json(
        buildV2ErrorEnvelope({
          session: {
            sessionId: parsedRequest.data.sessionId,
            isNew: false,
            userId: parsedRequest.data.user?.userId ?? null,
          },
          code: "ORCHESTRATION_FAILED",
          message: "Failed to orchestrate conversation",
        }),
      );
    }
  });

  return router;
}
