import { z } from "zod";

export const orchestrateRequestSchema = z
  .object({
    sessionId: z.string().uuid().nullable(),
    user: z
      .object({
        userId: z.string().min(1).nullable(),
        locale: z.string().min(1).nullable(),
        tz: z.string().min(1).nullable(),
      })
      .strict()
      .nullable(),
    mode: z.enum(["narration", "task"]),
    message: z
      .object({
        text: z.string().min(1).max(4000),
        source: z.enum(["voice", "typed"]),
      })
      .strict(),
    userChoice: z
      .object({
        moduleId: z.string().min(1),
      })
      .strict()
      .nullable(),
    contextHints: z
      .object({
        coparentTone: z.string().min(1).nullable(),
        userTone: z.string().min(1).nullable(),
      })
      .strict()
      .nullable(),
    debug: z.boolean().nullable(),
  })
  .strict();

export type OrchestrateRequest = z.infer<typeof orchestrateRequestSchema>;
