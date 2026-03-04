import { Router } from "express";
import { runRewriteMessage } from "../services/rewriteService";
import {
  rewriteMessageRequestSchema,
  rewriteMessageResponseSchema,
} from "../schemas/rewriteMessage";

export function createRewriteMessageModuleRoute(): Router {
  const router = Router();

  router.post("/rewrite-message", async (req, res) => {
    const parsedRequest = rewriteMessageRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedRequest.error.flatten(),
      });
    }

    try {
      const result = await runRewriteMessage(parsedRequest.data);
      const response = rewriteMessageResponseSchema.parse(result);
      return res.status(200).json(response);
    } catch (error) {
      console.error("[v2][rewrite-message] Failed to run module", error);
      return res.status(500).json({
        message: "Failed to rewrite message",
      });
    }
  });

  return router;
}
