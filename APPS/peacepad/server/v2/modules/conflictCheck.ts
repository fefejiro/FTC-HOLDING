import { Router } from "express";
import { MODULE_IDS } from "../registry/moduleRegistry";
import { runConflictCheck } from "../services/conflictService";
import {
  conflictCheckRequestSchema,
  conflictCheckResponseSchema,
} from "../schemas/conflictCheck";
import { withModuleRunTracking } from "../services/moduleRunTracker";
import { readRequestId } from "../services/requestId";

export function createConflictCheckModuleRoute(): Router {
  const router = Router();

  router.post("/conflict-check", async (req, res) => {
    const requestId = readRequestId(res.locals);
    const parsedRequest = conflictCheckRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedRequest.error.flatten(),
      });
    }

    try {
      const result = await withModuleRunTracking(
        {
          moduleId: MODULE_IDS.CONFLICT_CHECK,
          input: parsedRequest.data,
          userId: parsedRequest.data.context?.user_id,
          sessionId: parsedRequest.data.context?.session_id,
          requestId,
        },
        () => runConflictCheck(parsedRequest.data),
      );
      const response = conflictCheckResponseSchema.parse(result);
      return res.status(200).json(response);
    } catch (error) {
      console.error("[v2][conflict-check] Failed to run module", {
        requestId,
        errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        message: "Failed to run conflict check",
      });
    }
  });

  return router;
}
