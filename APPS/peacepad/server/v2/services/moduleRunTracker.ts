import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { ppV2ModuleRuns } from "@shared/schema";
import type { ModuleId } from "../registry/moduleRegistry";
import type { SafetyFlag } from "../schemas/common";

let trackingAvailable: boolean | null = null;
let missingTableWarningShown = false;

interface ModuleRunTrackContext {
  moduleId: ModuleId;
  input: unknown;
  userId?: string;
  sessionId?: string;
}

function hashPayload(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}

export async function withModuleRunTracking<T>(
  ctx: ModuleRunTrackContext,
  handler: () => Promise<T>,
): Promise<T> {
  if (trackingAvailable === false) {
    return handler();
  }

  const inputHash = hashPayload(ctx.input);
  let runId: string | undefined;

  try {
    const [created] = await db
      .insert(ppV2ModuleRuns)
      .values({
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        moduleId: ctx.moduleId,
        inputHash,
        status: "started",
      })
      .returning({ id: ppV2ModuleRuns.id });
    runId = created?.id;
    trackingAvailable = true;
  } catch (error) {
    // Tracking must never block module execution.
    const dbError = error as { code?: string };
    if (dbError.code === "42P01") {
      trackingAvailable = false;
      if (!missingTableWarningShown) {
        console.warn("[v2][tracker] tracking table missing; run v2 migrations to enable run auditing.");
        missingTableWarningShown = true;
      }
    } else {
      console.warn("[v2][tracker] start tracking failed", error);
    }
  }

  try {
    const output = await handler();
    const outputLike = output as { conflict_level?: unknown; safety_flags?: unknown };
    const conflictLevel =
      typeof outputLike.conflict_level === "number" ? outputLike.conflict_level : undefined;
    const safetyFlags = Array.isArray(outputLike.safety_flags)
      ? (outputLike.safety_flags as SafetyFlag[])
      : [];

    if (runId) {
      await db
        .update(ppV2ModuleRuns)
        .set({
          finishedAt: new Date(),
          conflictLevel,
          safetyFlags,
          outputHash: hashPayload(output),
          status: "success",
        })
        .where(eq(ppV2ModuleRuns.id, runId));
    }
    return output;
  } catch (error) {
    if (runId) {
      try {
        await db
          .update(ppV2ModuleRuns)
          .set({
            finishedAt: new Date(),
            status: "error",
            errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
          })
          .where(eq(ppV2ModuleRuns.id, runId));
      } catch (updateError) {
        console.warn("[v2][tracker] failed to update errored run", updateError);
      }
    }
    throw error;
  }
}
