import { z } from "zod";

export const conflictLevelSchema = z.number().int().min(0).max(4);

export const safetyFlagSchema = z.enum([
  "immediate_danger",
  "domestic_violence_risk",
  "self_harm_risk",
  "legal_escalation",
  "pressure_control",
  "off_topic",
  "high_conflict",
]);

export const cardSuggestionSchema = z
  .object({
    module_id: z.string().min(1),
    title: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();
