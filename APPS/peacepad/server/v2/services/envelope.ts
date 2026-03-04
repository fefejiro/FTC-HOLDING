import type { SafetyFlag } from "../schemas/common";
import type {
  V2EnvelopeAction,
  V2EnvelopeConflictLevel,
  V2ResponseEnvelope,
} from "../schemas/envelope";
import { v2ResponseEnvelopeSchema } from "../schemas/envelope";

interface V2EnvelopeSessionInput {
  sessionId?: string | null;
  isNew?: boolean;
  userId?: string | null;
}

interface V2EnvelopeIntentInput {
  id?: string | null;
  confidence?: number | null;
  source?: V2ResponseEnvelope["intent"]["source"];
}

interface V2EnvelopeConflictInput {
  score?: number;
  level?: V2EnvelopeConflictLevel;
  source?: V2ResponseEnvelope["analysis"]["conflict"]["source"];
  signals?: string[];
}

interface V2EnvelopeSafetyInput {
  safeToProceed?: boolean;
  flags?: Array<SafetyFlag | string>;
  handoff?: {
    type?: "none" | "support";
    reason?: string | null;
  };
}

interface BuildV2EnvelopeInput {
  ok?: boolean;
  session?: V2EnvelopeSessionInput;
  intent?: V2EnvelopeIntentInput;
  analysis?: {
    conflict?: V2EnvelopeConflictInput;
  };
  safety?: V2EnvelopeSafetyInput;
  explain?: {
    summary?: string;
    reasons?: string[];
  };
  actions?: V2EnvelopeAction[];
  ui?: {
    chips?: V2ResponseEnvelope["ui"]["chips"];
    cards?: unknown[];
  };
  data?: unknown;
  errors?: V2ResponseEnvelope["errors"];
}

export function clampScore(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function conflictScoreToLevel(score: number): V2EnvelopeConflictLevel {
  const normalized = clampScore(score);
  if (normalized >= 0.6) {
    return "high";
  }
  if (normalized >= 0.3) {
    return "medium";
  }
  return "low";
}

export function legacyConflictLevelToScore(level: number | undefined): number {
  if ((level ?? 0) >= 4) {
    return 1;
  }
  if ((level ?? 0) >= 3) {
    return 0.75;
  }
  if ((level ?? 0) >= 2) {
    return 0.5;
  }
  if ((level ?? 0) >= 1) {
    return 0.25;
  }
  return 0;
}

export function conflictLevelToChipVariant(
  level: V2EnvelopeConflictLevel,
): "info" | "warning" | "danger" {
  if (level === "high") {
    return "danger";
  }
  if (level === "medium") {
    return "warning";
  }
  return "info";
}

export function conflictChip(level: V2EnvelopeConflictLevel): V2ResponseEnvelope["ui"]["chips"][number] {
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return {
    id: "conflict_meter",
    label: `Conflict: ${label}`,
    variant: conflictLevelToChipVariant(level),
    expandable: true,
  };
}

export function buildMediumHighConflictActions(calmDraft?: string): V2EnvelopeAction[] {
  const actions: V2EnvelopeAction[] = [
    {
      id: "send_calm_response",
      label: "Send Calm Response",
      type: "copy",
      payload: {
        text: calmDraft ?? "",
      },
    },
    {
      id: "save_incident",
      label: "Save Incident",
      type: "save",
      payload: {
        category: "conflict_incident",
      },
    },
    {
      id: "find_support",
      label: "Find Support",
      type: "run_module",
      payload: {
        moduleId: "PP_MOD_SUPPORT_DISCOVERY",
      },
    },
    {
      id: "start_new_session",
      label: "Start New Session",
      type: "start_new_session",
      payload: {
        preserveProfile: true,
      },
    },
  ];

  if (!calmDraft) {
    actions[0] = {
      ...actions[0],
      payload: {
        text: "Could we continue this conversation calmly and focus on practical next steps?",
      },
    };
  }

  return actions;
}

export function buildSafetyActions(resourceUrl?: string): V2EnvelopeAction[] {
  const supportAction: V2EnvelopeAction = resourceUrl
    ? {
        id: "find_support",
        label: "Find Support",
        type: "open_url",
        payload: {
          url: resourceUrl,
        },
      }
    : {
        id: "find_support",
        label: "Find Support",
        type: "run_module",
        payload: {
          moduleId: "PP_MOD_SUPPORT_DISCOVERY",
        },
      };

  return [
    supportAction,
    {
      id: "start_new_session",
      label: "Start New Session",
      type: "start_new_session",
      payload: {
        preserveProfile: true,
      },
    },
  ];
}

export function buildV2Envelope(input: BuildV2EnvelopeInput): V2ResponseEnvelope {
  const score = clampScore(input.analysis?.conflict?.score ?? 0);
  const level = input.analysis?.conflict?.level ?? conflictScoreToLevel(score);

  const payload: V2ResponseEnvelope = {
    ok: input.ok ?? true,
    session: {
      sessionId: input.session?.sessionId ?? null,
      isNew: input.session?.isNew ?? false,
      userId: input.session?.userId ?? null,
    },
    intent: {
      id: input.intent?.id ?? null,
      confidence: input.intent?.confidence ?? null,
      source: input.intent?.source ?? "unknown",
    },
    analysis: {
      conflict: {
        score,
        level,
        source: input.analysis?.conflict?.source ?? "message_only",
        signals: (input.analysis?.conflict?.signals ?? []).slice(0, 20),
      },
    },
    safety: {
      safeToProceed: input.safety?.safeToProceed ?? true,
      flags: (input.safety?.flags ?? []).map((flag) => String(flag)),
      handoff: {
        type: input.safety?.handoff?.type ?? "none",
        reason: input.safety?.handoff?.reason ?? null,
      },
    },
    explain: {
      summary: input.explain?.summary ?? "",
      reasons: (input.explain?.reasons ?? []).slice(0, 3),
    },
    actions: input.actions ?? [],
    ui: {
      version: 1,
      chips: input.ui?.chips ?? [conflictChip(level)],
      cards: input.ui?.cards ?? [],
    },
    data: input.data ?? null,
    errors: input.errors ?? [],
  };

  return v2ResponseEnvelopeSchema.parse(payload);
}

export function buildV2ErrorEnvelope(input: {
  session?: V2EnvelopeSessionInput;
  intent?: V2EnvelopeIntentInput;
  code: string;
  message: string;
  data?: unknown;
}): V2ResponseEnvelope {
  return buildV2Envelope({
    ok: false,
    session: input.session,
    intent: input.intent,
    explain: {
      summary: input.message,
      reasons: [],
    },
    safety: {
      safeToProceed: true,
      flags: [],
      handoff: {
        type: "none",
        reason: null,
      },
    },
    data: input.data ?? null,
    errors: [
      {
        code: input.code,
        message: input.message,
      },
    ],
  });
}
