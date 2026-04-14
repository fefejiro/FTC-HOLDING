export type RuleToneCategory = "calm" | "tense" | "escalating";

export interface ToneAnalysisResult {
  category: RuleToneCategory;
  confidence: number;
  flags: string[];
  summary: string;
  emoji: string;
  rewordingSuggestion: string | null;
}

const ESCALATION_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  { pattern: /you\s+(always|never)/i, flag: "Absolute language can sound accusatory." },
  { pattern: /your\s+fault/i, flag: "Direct blame language detected." },
  { pattern: /because\s+of\s+you/i, flag: "Blame framing detected." },
  { pattern: /you\s+made\s+me/i, flag: "Responsibility is being assigned to the other person." },
  { pattern: /this\s+is\s+your\s+fault/i, flag: "Direct blame language detected." },
  { pattern: /you\s+(should|need\s+to|have\s+to)/i, flag: "Command-style phrasing can raise defensiveness." },
  { pattern: /whatever/i, flag: "Dismissive wording detected." },
  { pattern: /\bfine\.\s*$/i, flag: "Short clipped wording can read as passive-aggressive." },
  { pattern: /\bsure\.\s*$/i, flag: "Short clipped wording can read as passive-aggressive." },
  { pattern: /[A-Z]{5,}/, flag: "All caps can feel like yelling." },
];

const TENSE_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  { pattern: /why\s+(did|didn't|cant|can't|won't|wont)\s+you/i, flag: "This question may feel accusatory." },
  { pattern: /when\s+are\s+you\s+going\s+to/i, flag: "This may feel like pressure." },
  { pattern: /you\s+(didn't|didnt|don't|dont|can't|cant|won't|wont)/i, flag: "Negative framing detected." },
  { pattern: /right\s+now/i, flag: "Time pressure detected." },
  { pattern: /\bimmediately\b/i, flag: "Urgent wording can add pressure." },
  { pattern: /\basap\b/i, flag: "Urgent wording can add pressure." },
];

const CALM_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  { pattern: /\bcan\s+we\b/i, flag: "Collaborative language detected." },
  { pattern: /\blet'?s\b/i, flag: "Collaborative language detected." },
  { pattern: /\btogether\b/i, flag: "Shared-problem framing detected." },
  { pattern: /^i\s+(feel|think|would|need)\b/i, flag: "I-statement detected." },
  { pattern: /would\s+you\s+be\s+(willing|able)/i, flag: "Respectful request framing detected." },
  { pattern: /is\s+it\s+possible/i, flag: "Flexible question framing detected." },
];

function uniqueFlags(flags: string[]): string[] {
  return Array.from(new Set(flags));
}

function normalizeRewrite(message: string): string {
  return message
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function generateRewrite(message: string, category: RuleToneCategory): string | null {
  if (category === "calm") {
    return null;
  }

  let rewrite = message;

  rewrite = rewrite.replace(/you\s+always/gi, "I've noticed that sometimes");
  rewrite = rewrite.replace(/you\s+never/gi, "I'd appreciate it if you could");
  rewrite = rewrite.replace(/you\s+should/gi, "could you");
  rewrite = rewrite.replace(/you\s+need\s+to/gi, "could you");
  rewrite = rewrite.replace(/you\s+have\s+to/gi, "could you");
  rewrite = rewrite.replace(/because\s+of\s+you/gi, "because this situation");
  rewrite = rewrite.replace(/this\s+is\s+your\s+fault/gi, "I'm upset about how this unfolded");
  rewrite = rewrite.replace(/you\s+made\s+me/gi, "I felt");
  rewrite = rewrite.replace(/whatever/gi, "I don't think we're aligned yet");
  rewrite = rewrite.replace(/\bASAP\b/gi, "when you can");
  rewrite = rewrite.replace(/!{2,}/g, "!");
  rewrite = rewrite.replace(/\?{2,}/g, "?");
  rewrite = rewrite.replace(/\b([A-Z]{5,})\b/g, (match) => match.toLowerCase());

  const normalizedOriginal = normalizeRewrite(message);
  const normalizedRewrite = normalizeRewrite(rewrite);

  if (!normalizedRewrite || normalizedRewrite === normalizedOriginal) {
    return null;
  }

  return normalizedRewrite;
}

export function analyzeTone(message: string): ToneAnalysisResult {
  const text = (message || "").trim();
  if (!text) {
    return {
      category: "calm",
      confidence: 1,
      flags: [],
      summary: "Empty message",
      emoji: "✍️",
      rewordingSuggestion: null,
    };
  }

  const flags: string[] = [];
  let escalationScore = 0;
  let tenseScore = 0;
  let calmScore = 0;

  for (const { pattern, flag } of ESCALATION_PATTERNS) {
    if (pattern.test(text)) {
      escalationScore += pattern.source.includes("(always|never)") ? 1 : 2;
      flags.push(flag);
    }
  }

  for (const { pattern, flag } of TENSE_PATTERNS) {
    if (pattern.test(text)) {
      tenseScore += 1;
      flags.push(flag);
    }
  }

  for (const { pattern, flag } of CALM_PATTERNS) {
    if (pattern.test(text)) {
      calmScore += 1;
      flags.push(flag);
    }
  }

  const questionMarkCount = (text.match(/\?/g) || []).length;
  const hasExcessivePunctuation = /[!?]{2,}/.test(text);

  if (questionMarkCount >= 3) {
    tenseScore += 1;
    flags.push("Multiple questions may feel interrogative.");
  }

  if (hasExcessivePunctuation) {
    escalationScore += 1;
    flags.push("Excessive punctuation can make the message feel heated.");
  }

  let category: RuleToneCategory;
  let confidence: number;
  let summary: string;
  let emoji: string;

  if (escalationScore >= 2) {
    category = "escalating";
    confidence = Math.min((escalationScore + tenseScore) / 5, 1);
    summary = "This message might escalate tension";
    emoji = "🔥";
  } else if (tenseScore >= 2 || escalationScore === 1) {
    category = "tense";
    confidence = Math.min((tenseScore + escalationScore) / 4, 1);
    summary = "This message feels a bit tense";
    emoji = "⚠️";
  } else if (calmScore >= 1) {
    category = "calm";
    confidence = Math.min(calmScore / 2, 1);
    summary = "This message feels calm and collaborative";
    emoji = "✅";
  } else {
    category = "calm";
    confidence = 0.5;
    summary = "This message seems neutral";
    emoji = "📝";
  }

  return {
    category,
    confidence,
    flags: uniqueFlags(flags),
    summary,
    emoji,
    rewordingSuggestion: generateRewrite(text, category),
  };
}
