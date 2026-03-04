import { Router } from "express";
import { MODULE_IDS } from "../registry/moduleRegistry";
import { runSupportDiscovery } from "../services/supportDiscoveryService";
import {
  supportDiscoveryRequestSchema,
  supportDiscoveryResponseSchema,
} from "../schemas/supportDiscovery";
import { withModuleRunTracking } from "../services/moduleRunTracker";
import { readRequestId } from "../services/requestId";

export function createSupportDiscoveryModuleRoute(): Router {
  const router = Router();

  router.post("/support-discovery", async (req, res) => {
    const requestId = readRequestId(res.locals);
    const parsedRequest = supportDiscoveryRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedRequest.error.flatten(),
      });
    }

    try {
      const result = await withModuleRunTracking(
        {
          moduleId: MODULE_IDS.SUPPORT_DISCOVERY,
          input: parsedRequest.data,
          userId: parsedRequest.data.context?.user_id,
          sessionId: parsedRequest.data.context?.session_id,
          requestId,
        },
        () => runSupportDiscovery(parsedRequest.data),
      );
      const response = supportDiscoveryResponseSchema.parse(result);
      return res.status(200).json(response);
    } catch (error) {
      console.error("[v2][support-discovery] Failed to run module", {
        requestId,
        errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        message: "Failed to discover support resources",
      });
    }
  });

  return router;
}
