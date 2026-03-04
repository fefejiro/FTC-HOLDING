import { analyzeDraftTone, type DraftToneAnalysis } from "../../services/prepChatService";
import type { RewriteMessageRequest, RewriteMessageResponse } from "../schemas/rewriteMessage";
import { detectSafetyFlagsFromText, hasCrisisSafetyFlag } from "./safetySignals";

type AnalyzeDraftToneFn = (
  draft: string,
  coParentPersonality?: string,
  userPersonality?: string,
) => Promise<DraftToneAnalysis>;

export interface RewriteServiceDependencies {
  analyzeDraftToneFn?: AnalyzeDraftToneFn;
}

const ESCALATION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\byou always\b/gi, replacement: "I feel this has happened repeatedly" },
  { pattern: /\byou never\b/gi, replacement: "I feel this has not been happening consistently" },
  { pattern: /\bit's your fault\b/gi, replacement: "this has been difficult for me" },
  { pattern: /\bor else\b/gi, replacement: "" },
  { pattern: /\b(idiot|stupid|crazy|worthless|trash)\b/gi, replacement: "frustrated" },
  { pattern: /\b(shut up)\b/gi, replacement: "please pause" },
];

function mapToneToConflictLevel(tone: DraftToneAnalysis["overallTone"], score: number): number {
  if (tone === "confrontational") {
    return score <= 15 ? 4 : 3;
  }
  if (tone === "tense") {
    return 2;
  }
  if (tone === "neutral") {
    return 1;
  }
  return 0;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function ensureSentence(text: string): string {
  const normalized = normalizeText(text);
  if (!normalized) {
    return "Could we discuss this calmly when you have a moment?";
  }
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function sanitizeEscalation(text: string): string {
  let sanitized = text;
  for (const rule of ESCALATION_PATTERNS) {
    sanitized = sanitized.replace(rule.pattern, rule.replacement);
  }
  return ensureSentence(sanitized);
}

function applyStyleHints(
  text: string,
  options: {
    userStyle?: string;
    coparentStyle?: string;
  },
): string {
  const userStyle = options.userStyle?.toLowerCase() ?? "";
  const coparentStyle = options.coparentStyle?.toLowerCase() ?? "";
  let styled = text;

  if (userStyle.includes("direct")) {
    styled = styled.replace(/\bI want to make sure\b/gi, "I want");
  }
  if (userStyle.includes("empathetic") || userStyle.includes("gentle")) {
    styled = `I understand this may feel stressful. ${styled}`;
  }

  if (coparentStyle.includes("analytical") || coparentStyle.includes("direct")) {
    styled = `${styled} Please confirm the plan that works for you.`;
  } else if (coparentStyle.includes("sensitive") || coparentStyle.includes("emotional")) {
    styled = `${styled} I want to keep this respectful and clear.`;
  }

  return ensureSentence(styled);
}

function buildVariant(
  base: string,
  variant: "calm" | "neutral" | "boundary",
  options: {
    userStyle?: string;
    coparentStyle?: string;
  },
): string {
  let draft = base;

  if (variant === "calm") {
    draft = `I want to make sure we handle this calmly. ${base}`;
  } else if (variant === "neutral") {
    draft = `${base} Please confirm what works for you.`;
  } else {
    draft = `I want to keep this respectful. ${base} I will continue this conversation when we can stay solution-focused.`;
  }

  return sanitizeEscalation(applyStyleHints(draft, options));
}

export async function runRewriteMessage(
  input: RewriteMessageRequest,
  deps: RewriteServiceDependencies = {},
): Promise<RewriteMessageResponse> {
  const analyzeDraftToneFn = deps.analyzeDraftToneFn ?? analyzeDraftTone;
  const toneAnalysis = await analyzeDraftToneFn(input.text, input.coparent_style, input.user_style);

  const baseConflictLevel = mapToneToConflictLevel(toneAnalysis.overallTone, toneAnalysis.toneScore);
  let conflictLevel = Math.max(baseConflictLevel, input.conflict_level ?? 0);
  const safetyFlags = detectSafetyFlagsFromText(input.text, { conflictLevel });

  if (hasCrisisSafetyFlag(safetyFlags)) {
    conflictLevel = 4;
  }

  const baseDraft = sanitizeEscalation(toneAnalysis.suggestedRevision || input.text);
  const rewrittenCalm = buildVariant(baseDraft, "calm", {
    userStyle: input.user_style,
    coparentStyle: input.coparent_style,
  });
  const rewrittenNeutral = buildVariant(baseDraft, "neutral", {
    userStyle: input.user_style,
    coparentStyle: input.coparent_style,
  });
  const rewrittenBoundary = buildVariant(baseDraft, "boundary", {
    userStyle: input.user_style,
    coparentStyle: input.coparent_style,
  });

  const notes = [
    `Detected tone: ${toneAnalysis.overallTone} (${toneAnalysis.toneScore}/100).`,
    toneAnalysis.howItMightBePerceived,
  ];

  if (input.user_style || input.coparent_style) {
    notes.push("Applied personality-aware wording adjustments for user/co-parent styles.");
  }

  return {
    rewritten_calm: rewrittenCalm,
    rewritten_neutral: rewrittenNeutral,
    rewritten_boundary: rewrittenBoundary,
    conflict_level: conflictLevel,
    safety_flags: safetyFlags,
    notes: notes.slice(0, 8),
  };
}
