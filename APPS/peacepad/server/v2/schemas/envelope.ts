import { z } from "zod";

export const envelopeIntentSourceSchema = z.enum(["user_choice", "router", "unknown"]);
export const envelopeConflictLevelSchema = z.enum(["low", "medium", "high"]);
export const envelopeConflictSourceSchema = z.enum(["message_only", "history_assisted"]);

export const envelopeActionTypeSchema = z.enum([
  "copy",
  "run_module",
  "open_url",
  "save",
  "start_new_session",
]);

export const envelopeActionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: envelopeActionTypeSchema,
    payload: z.unknown(),
  })
  .strict();

export const envelopeChipSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    variant: z.enum(["info", "warning", "danger"]),
    expandable: z.boolean(),
  })
  .strict();

export const envelopeErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

export const v2ResponseEnvelopeSchema = z
  .object({
    ok: z.boolean(),
    session: z
      .object({
        sessionId: z.string().min(1).nullable(),
        isNew: z.boolean(),
        userId: z.string().min(1).nullable(),
      })
      .strict(),
    intent: z
      .object({
        id: z.string().min(1).nullable(),
        confidence: z.number().min(0).max(1).nullable(),
        source: envelopeIntentSourceSchema,
      })
      .strict(),
    analysis: z
      .object({
        conflict: z
          .object({
            score: z.number().min(0).max(1),
            level: envelopeConflictLevelSchema,
            source: envelopeConflictSourceSchema,
            signals: z.array(z.string().min(1)),
          })
          .strict(),
      })
      .strict(),
    safety: z
      .object({
        safeToProceed: z.boolean(),
        flags: z.array(z.string().min(1)),
        handoff: z
          .object({
            type: z.enum(["none", "support"]),
            reason: z.string().nullable(),
          })
          .strict(),
      })
      .strict(),
    explain: z
      .object({
        summary: z.string(),
        reasons: z.array(z.string()),
      })
      .strict(),
    actions: z.array(envelopeActionSchema),
    ui: z
      .object({
        version: z.literal(1),
        chips: z.array(envelopeChipSchema),
        cards: z.array(z.unknown()),
      })
      .strict(),
    data: z.unknown(),
    errors: z.array(envelopeErrorSchema),
  })
  .strict();

export type V2ResponseEnvelope = z.infer<typeof v2ResponseEnvelopeSchema>;
export type V2EnvelopeAction = z.infer<typeof envelopeActionSchema>;
export type V2EnvelopeConflictLevel = z.infer<typeof envelopeConflictLevelSchema>;
