import { Router } from "express";
import { runConflictCheck } from "../services/conflictService";
import {
  conflictCheckRequestSchema,
  conflictCheckResponseSchema,
} from "../schemas/conflictCheck";

export function createConflictCheckModuleRoute(): Router {
  const router = Router();

  router.post("/conflict-check", async (req, res) => {
    const parsedRequest = conflictCheckRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedRequest.error.flatten(),
      });
    }

    try {
      const result = await runConflictCheck(parsedRequest.data);
      const response = conflictCheckResponseSchema.parse(result);
      return res.status(200).json(response);
    } catch (error) {
      console.error("[v2][conflict-check] Failed to run module", error);
      return res.status(500).json({
        message: "Failed to run conflict check",
      });
    }
  });

  return router;
}
