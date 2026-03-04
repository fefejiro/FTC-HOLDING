import { Router } from "express";
import { MODULE_IDS } from "../registry/moduleRegistry";
import { routeIntent } from "./intentRouter";
import { intentRouteRequestSchema, intentRouteResponseSchema } from "../schemas/intent";
import { withModuleRunTracking } from "../services/moduleRunTracker";
import { readRequestId } from "../services/requestId";

export function createIntentRoute(): Router {
  const router = Router();

  router.post("/intent", async (req, res) => {
    const requestId = readRequestId(res.locals);
    const parsedRequest = intentRouteRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedRequest.error.flatten(),
      });
    }

    try {
      const response = await withModuleRunTracking(
        {
          moduleId: MODULE_IDS.ROUTER_INTENT,
          input: parsedRequest.data,
          userId: parsedRequest.data.context?.user_id,
          sessionId: parsedRequest.data.context?.session_id,
          requestId,
        },
        () => routeIntent(parsedRequest.data),
      );
      const parsedResponse = intentRouteResponseSchema.parse(response);
      return res.status(200).json(parsedResponse);
    } catch (error) {
      console.error("[v2][intent] Failed to route intent", {
        requestId,
        errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        message: "Failed to route intent",
      });
    }
  });

  return router;
}
