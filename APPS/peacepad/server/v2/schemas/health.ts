import { z } from "zod";

const dependencySchema = z
  .object({
    reachable: z.boolean(),
    checked_at: z.string().datetime(),
  })
  .strict();

export const v2HealthResponseSchema = z
  .object({
    status: z.literal("ok"),
    version: z.literal("v2"),
    time: z.string().datetime(),
    commit: z.string().min(1).optional(),
    dependencies: z
      .object({
        database: dependencySchema.optional(),
      })
      .strict(),
  })
  .strict();

export type V2HealthData = z.infer<typeof v2HealthResponseSchema>;
