import { Router } from "express";
import { MODULE_IDS } from "../registry/moduleRegistry";
import { runRewriteMessage } from "../services/rewriteService";
import {
  rewriteMessageRequestSchema,
  rewriteMessageResponseSchema,
} from "../schemas/rewriteMessage";
import { withModuleRunTracking } from "../services/moduleRunTracker";
import { readRequestId } from "../services/requestId";

export function createRewriteMessageModuleRoute(): Router {
  const router = Router();

  router.post("/rewrite-message", async (req, res) => {
    const requestId = readRequestId(res.locals);
    const parsedRequest = rewriteMessageRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedRequest.error.flatten(),
      });
    }

    try {
      const result = await withModuleRunTracking(
        {
          moduleId: MODULE_IDS.REWRITE_MESSAGE,
          input: parsedRequest.data,
          userId: parsedRequest.data.context?.user_id,
          sessionId: parsedRequest.data.context?.session_id,
          requestId,
        },
        () => runRewriteMessage(parsedRequest.data),
      );
      const response = rewriteMessageResponseSchema.parse(result);
      return res.status(200).json(response);
    } catch (error) {
      console.error("[v2][rewrite-message] Failed to run module", {
        requestId,
        errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        message: "Failed to rewrite message",
      });
    }
  });

  return router;
}
