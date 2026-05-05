import { conflictScoreToLevel, clampScore } from "./envelope";

const DENIED_ACCESS_PATTERNS = [
  /\b(denied|refused|refusing|withhold|won't let|will not let|blocked access|keeping .* from me)\b/i,
  /\b(not allowed to see|no access to|prevented me from seeing)\b/i,
];

const INSULT_OR_PROFANITY_PATTERNS = [
  /\b(idiot|stupid|crazy|worthless|trash|loser|dumb|shut up)\b/i,
  /\b(fuck|f\*ck|shit|bitch|asshole|bastard)\b/i,
];

const LEGAL_THREAT_PATTERNS = [
  /\b(lawyer|attorney|court|restraining order|legal action|sue|custody battle)\b/i,
  /\b(see you in court|i'll take you to court)\b/i,
];

export interface DeterministicFallbackResult {
  score: number;
  level: "low" | "medium" | "high";
  signals: string[];
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function scoreConflictFallback(text: string): DeterministicFallbackResult {
  const normalized = text.trim().toLowerCase();
  const signals: string[] = [];
  let score = 0;

  if (hasPattern(normalized, DENIED_ACCESS_PATTERNS)) {
    score = Math.max(score, 0.7);
    signals.push("denied_access_language");
  }

  if (hasPattern(normalized, INSULT_OR_PROFANITY_PATTERNS)) {
    score += 0.1;
    signals.push("insults_or_profanity");
  }

  if (hasPattern(normalized, LEGAL_THREAT_PATTERNS)) {
    score += 0.2;
    signals.push("legal_threat_language");
  }

  const normalizedScore = clampScore(score);
  return {
    score: normalizedScore,
    level: conflictScoreToLevel(normalizedScore),
    signals,
  };
}

export function fallbackScoreToLegacyConflictLevel(score: number): number {
  const normalized = clampScore(score);

  if (normalized >= 0.6) {
    return 3;
  }
  if (normalized >= 0.3) {
    return 2;
  }
  if (normalized > 0) {
    return 1;
  }
  return 0;
}
