import { Router } from "express";
import { routeIntent } from "./intentRouter";
import { intentRouteRequestSchema, intentRouteResponseSchema } from "../schemas/intent";

export function createIntentRoute(): Router {
  const router = Router();

  router.post("/intent", async (req, res) => {
    const parsedRequest = intentRouteRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedRequest.error.flatten(),
      });
    }

    try {
      const response = await routeIntent(parsedRequest.data);
      const parsedResponse = intentRouteResponseSchema.parse(response);
      return res.status(200).json(parsedResponse);
    } catch (error) {
      console.error("[v2][intent] Failed to route intent", error);
      return res.status(500).json({
        message: "Failed to route intent",
      });
    }
  });

  return router;
}
