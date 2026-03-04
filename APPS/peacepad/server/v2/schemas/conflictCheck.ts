import { z } from "zod";
import { conflictLevelSchema, safetyFlagSchema } from "./common.ts";

export const conflictSignalSchema = z
  .object({
    type: z.enum(["linguistic", "behavioral", "contextual", "pattern", "model"]),
    key: z.string().min(1),
    description: z.string().min(1),
    weight: z.number(),
  })
  .strict();

export const conflictCheckRequestSchema = z
  .object({
    text: z.string().min(1).max(4000),
    conversation_history: z.array(z.string().min(1).max(4000)).max(25).optional(),
    user_style: z.string().min(1).max(80).optional(),
    coparent_style: z.string().min(1).max(80).optional(),
    context: z
      .object({
        user_id: z.string().min(1).max(120).optional(),
        session_id: z.string().min(1).max(120).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ConflictCheckRequest = z.infer<typeof conflictCheckRequestSchema>;

export const conflictCheckResponseSchema = z
  .object({
    conflict_level: conflictLevelSchema,
    signals: z.array(conflictSignalSchema),
    safety_flags: z.array(safetyFlagSchema),
    recommended_next_actions: z.array(z.string().min(1)).max(8),
    do_not_say: z.array(z.string().min(1)).max(10),
  })
  .strict();

export type ConflictCheckResponse = z.infer<typeof conflictCheckResponseSchema>;
