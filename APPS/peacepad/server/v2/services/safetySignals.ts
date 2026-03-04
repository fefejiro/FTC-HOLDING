import type { SafetyFlag } from "../schemas/common";

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectSafetyFlagsFromText(
  text: string,
  options: {
    conflictLevel?: number;
    isOffTopic?: boolean;
  } = {},
): SafetyFlag[] {
  const flags = new Set<SafetyFlag>();
  const normalized = text.toLowerCase();

  if (hasPattern(normalized, [/\b(kill|hurt|hit|harm|threaten|abuse|unsafe)\b/i])) {
    flags.add("immediate_danger");
    flags.add("domestic_violence_risk");
  }

  if (hasPattern(normalized, [/\b(self harm|suicide|end my life|kill myself)\b/i])) {
    flags.add("self_harm_risk");
  }

  if (hasPattern(normalized, [/\b(court|lawyer|legal action|restraining order)\b/i])) {
    flags.add("legal_escalation");
  }

  if (hasPattern(normalized, [/\b(or else|you better|answer me now|last chance)\b/i])) {
    flags.add("pressure_control");
  }

  if ((options.conflictLevel ?? 0) >= 3) {
    flags.add("high_conflict");
  }

  if (options.isOffTopic) {
    flags.add("off_topic");
  }

  return Array.from(flags);
}

export function hasCrisisSafetyFlag(flags: SafetyFlag[]): boolean {
  return flags.some((flag) =>
    ["immediate_danger", "domestic_violence_risk", "self_harm_risk"].includes(flag),
  );
}
