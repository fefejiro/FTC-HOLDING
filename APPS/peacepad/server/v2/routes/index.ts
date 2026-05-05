import { Router } from "express";
import { pool } from "../../db";
import { createConflictCheckModuleRoute } from "../modules/conflictCheck";
import { createRewriteMessageModuleRoute } from "../modules/rewriteMessage";
import { createSupportDiscoveryModuleRoute } from "../modules/supportDiscovery";
import { createIntentRoute } from "../router/intentRoute";
import { v2HealthResponseSchema } from "../schemas/health";
import { buildV2Envelope, buildV2ErrorEnvelope } from "../services/envelope";
import { createConversationRoute } from "./conversation";

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

interface V2RouterDependencies {
  getDatabaseDependencyCheckFn?: typeof getDatabaseDependencyCheck;
  conversationRouteDeps?: Parameters<typeof createConversationRoute>[0];
  intentRouteDeps?: Parameters<typeof createIntentRoute>[0];
  conflictRouteDeps?: Parameters<typeof createConflictCheckModuleRoute>[0];
  rewriteRouteDeps?: Parameters<typeof createRewriteMessageModuleRoute>[0];
  supportRouteDeps?: Parameters<typeof createSupportDiscoveryModuleRoute>[0];
}

export function createV2Router(deps: V2RouterDependencies = {}): Router {
  const router = Router();
  const getDatabaseDependencyCheckFn =
    deps.getDatabaseDependencyCheckFn ?? getDatabaseDependencyCheck;

  router.get("/health", async (_req, res) => {
    try {
      const payload = {
        status: "ok" as const,
        version: "v2" as const,
        time: new Date().toISOString(),
        commit: resolveCommitSha(),
        dependencies: {
          database: await getDatabaseDependencyCheckFn(),
        },
      };

      const data = v2HealthResponseSchema.parse(payload);
      const envelope = buildV2Envelope({
        ok: true,
        session: {
          sessionId: null,
          isNew: false,
          userId: null,
        },
        intent: {
          id: "health",
          confidence: 1,
          source: "unknown",
        },
        explain: {
          summary: "v2 health check is operational.",
          reasons: ["Database dependency check completed."],
        },
        data,
        errors: [],
      });
      return res.status(200).json(envelope);
    } catch (error) {
      console.error("[v2][health] Failed to build health response", error);
      return res.status(500).json(
        buildV2ErrorEnvelope({
          code: "HEALTH_CHECK_FAILED",
          message: "Failed to generate v2 health response",
        }),
      );
    }
  });

  router.use("/conversation", createConversationRoute(deps.conversationRouteDeps));
  router.use("/router", createIntentRoute(deps.intentRouteDeps));
  router.use("/modules", createConflictCheckModuleRoute(deps.conflictRouteDeps));
  router.use("/modules", createRewriteMessageModuleRoute(deps.rewriteRouteDeps));
  router.use("/modules", createSupportDiscoveryModuleRoute(deps.supportRouteDeps));

  return router;
}
