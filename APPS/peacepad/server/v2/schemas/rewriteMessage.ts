import { z } from "zod";
import { conflictLevelSchema, safetyFlagSchema } from "./common.ts";

export const rewriteMessageRequestSchema = z
  .object({
    text: z.string().min(1).max(4000),
    user_style: z.string().min(1).max(80).optional(),
    coparent_style: z.string().min(1).max(80).optional(),
    conflict_level: conflictLevelSchema.optional(),
    context: z
      .object({
        user_id: z.string().min(1).max(120).optional(),
        session_id: z.string().min(1).max(120).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type RewriteMessageRequest = z.infer<typeof rewriteMessageRequestSchema>;

export const rewriteMessageResponseSchema = z
  .object({
    rewritten_calm: z.string().min(1),
    rewritten_neutral: z.string().min(1),
    rewritten_boundary: z.string().min(1),
    conflict_level: conflictLevelSchema,
    safety_flags: z.array(safetyFlagSchema),
    notes: z.array(z.string().min(1)).max(8),
  })
  .strict();

export type RewriteMessageResponse = z.infer<typeof rewriteMessageResponseSchema>;
