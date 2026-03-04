import { z } from "zod";
import { MODULE_IDS } from "../registry/moduleRegistry.ts";
import { cardSuggestionSchema, conflictLevelSchema, safetyFlagSchema } from "./common.ts";

export const intentRouteRequestSchema = z
  .object({
    text: z.string().min(1).max(4000),
    user_style: z.string().min(1).max(80).optional(),
    coparent_style: z.string().min(1).max(80).optional(),
    context: z
      .object({
        conversation_history: z.array(z.string().min(1).max(4000)).max(25).optional(),
        session_id: z.string().min(1).max(120).optional(),
        user_id: z.string().min(1).max(120).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type IntentRouteRequest = z.infer<typeof intentRouteRequestSchema>;

export const intentRouteResponseSchema = z
  .object({
    module_id: z.enum([
      MODULE_IDS.ROUTER_INTENT,
      MODULE_IDS.CONFLICT_CHECK,
      MODULE_IDS.REWRITE_MESSAGE,
      MODULE_IDS.SUPPORT_DISCOVERY,
    ]),
    conflict_level: conflictLevelSchema,
    safety_flags: z.array(safetyFlagSchema),
    recommended_action: z.string().min(1),
    followup_questions: z.array(z.string().min(1)).max(5),
    suggested_cards: z.array(cardSuggestionSchema).max(5),
  })
  .strict();

export type IntentRouteResponse = z.infer<typeof intentRouteResponseSchema>;
