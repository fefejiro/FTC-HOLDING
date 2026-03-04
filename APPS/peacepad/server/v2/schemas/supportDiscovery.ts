import { z } from "zod";
import { conflictLevelSchema, safetyFlagSchema } from "./common";

export const supportDiscoveryRequestSchema = z
  .object({
    query: z.string().min(1).max(250).optional(),
    category: z.string().min(1).max(80).optional(),
    conflict_level: conflictLevelSchema.optional(),
    safety_flags: z.array(safetyFlagSchema).optional(),
    limit: z.number().int().min(1).max(20).optional(),
    location: z
      .object({
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        city: z.string().min(1).max(80).optional(),
        country_code: z.string().min(2).max(3).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type SupportDiscoveryRequest = z.infer<typeof supportDiscoveryRequestSchema>;

export const rankedResourceSchema = z
  .object({
    title: z.string().min(1),
    type: z.string().min(1),
    location: z.string().min(1),
    url: z.string().url(),
    phone: z.string().min(1).optional(),
    disclaimer: z.string().min(1),
  })
  .strict();

export const supportDiscoveryResponseSchema = z
  .object({
    ranked_resources: z.array(rankedResourceSchema).max(20),
  })
  .strict();

export type SupportDiscoveryResponse = z.infer<typeof supportDiscoveryResponseSchema>;
