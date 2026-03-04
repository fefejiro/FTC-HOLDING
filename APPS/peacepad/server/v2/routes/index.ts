import { Router } from "express";
import { pool } from "../../db";
import { createConflictCheckModuleRoute } from "../modules/conflictCheck";
import { createRewriteMessageModuleRoute } from "../modules/rewriteMessage";
import { createSupportDiscoveryModuleRoute } from "../modules/supportDiscovery";
import { createIntentRoute } from "../router/intentRoute";
import { v2HealthResponseSchema } from "../schemas/health";
import {
  resolveRequestId,
  V2_REQUEST_ID_HEADER,
  V2_REQUEST_ID_LOCALS_KEY,
} from "../services/requestId";

function resolveCommitSha(): string | undefined {
  return (
    process.env.PEACEPAD_COMMIT_SHA ||
    process.env.COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA
  );
}

async function getDatabaseDependencyCheck() {
  const checkedAt = new Date().toISOString();
  try {
    await pool.query("SELECT 1");
    return {
      reachable: true,
      checked_at: checkedAt,
    };
  } catch {
    return {
      reachable: false,
      checked_at: checkedAt,
    };
  }
}

export function createV2Router(): Router {
  const router = Router();

  router.use((req, res, next) => {
    const requestId = resolveRequestId(req.header(V2_REQUEST_ID_HEADER) || undefined);
    res.locals[V2_REQUEST_ID_LOCALS_KEY] = requestId;
    res.setHeader(V2_REQUEST_ID_HEADER, requestId);
    next();
  });

  router.get("/health", async (_req, res) => {
    const payload = {
      status: "ok" as const,
      version: "v2" as const,
      time: new Date().toISOString(),
      commit: resolveCommitSha(),
      dependencies: {
        database: await getDatabaseDependencyCheck(),
      },
    };

    const response = v2HealthResponseSchema.parse(payload);
    return res.status(200).json(response);
  });

  router.use("/router", createIntentRoute());
  router.use("/modules", createConflictCheckModuleRoute());
  router.use("/modules", createRewriteMessageModuleRoute());
  router.use("/modules", createSupportDiscoveryModuleRoute());

  return router;
}
