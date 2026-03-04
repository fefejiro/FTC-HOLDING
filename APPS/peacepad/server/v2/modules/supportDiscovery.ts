import { Router } from "express";
import { runSupportDiscovery } from "../services/supportDiscoveryService";
import {
  supportDiscoveryRequestSchema,
  supportDiscoveryResponseSchema,
} from "../schemas/supportDiscovery";

export function createSupportDiscoveryModuleRoute(): Router {
  const router = Router();

  router.post("/support-discovery", async (req, res) => {
    const parsedRequest = supportDiscoveryRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedRequest.error.flatten(),
      });
    }

    try {
      const result = await runSupportDiscovery(parsedRequest.data);
      const response = supportDiscoveryResponseSchema.parse(result);
      return res.status(200).json(response);
    } catch (error) {
      console.error("[v2][support-discovery] Failed to run module", error);
      return res.status(500).json({
        message: "Failed to discover support resources",
      });
    }
  });

  return router;
}
