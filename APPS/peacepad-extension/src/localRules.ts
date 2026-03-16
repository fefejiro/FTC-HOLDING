import type { AnalyzeMessageRequest, PreflightResponse, PreflightSignal } from "@ftc/peacepad-sdk";

type RiskLevel = PreflightResponse["risk_level"];
type SignalCategory = PreflightSignal["category"];
type LocalRuleGroup =
  | "profanity"
  | "insult"
  | "hostility"
  | "escalation"
  | "threat"
  | "dismissive"
  | "accusatory"
  | "parenting"
  | "taunt"
  | "professional_risk";
type LocalRuleSeverity = "strong" | "mild";

interface LocalRuleSeed {
  phrase: string;
  group: LocalRuleGroup;
  severity: LocalRuleSeverity;
  code: string;
  category: SignalCategory;
  weight: number;
  description: string;
  moderationFlag?: string;
}

interface RuleDefinition {
  pattern: RegExp;
  group: LocalRuleGroup;
  code: string;
  category: SignalCategory;
  weight: number;
  description: string;
  moderationFlag?: string;
}

interface ReductionRule {
  pattern: RegExp;
  code: string;
  category: SignalCategory;
  reduction: number;
  description: string;
}

interface EvaluationState {
  normalized: string;
  score: number;
  signals: PreflightSignal[];
  moderationFlags: Set<string>;
  matchedCodes: Set<string>;
  matchedGroups: Set<LocalRuleGroup>;
  positiveSignals: number;
  sensitiveContext: boolean;
  childContext: boolean;
  businessContext: boolean;
}

interface LocalResolvedDecision {
  kind: "resolved";
  classification: "safe" | "mild" | "strong";
  response: PreflightResponse;
}

interface LocalFallbackDecision {
  kind: "fallback";
  classification: "ambiguous";
  reason: string;
  score: number;
  signals: PreflightSignal[];
}

export type LocalPreflightDecision = LocalResolvedDecision | LocalFallbackDecision;

const CONTRACT_VERSION = "peacepad-preflight@1";
export const LOCAL_RULESET_VERSION = "extension-local-rules-v2";
export const LOCAL_RULESET_SOURCE =
  "APPS/peacepad-extension/src/localRules.ts (expanded from APPS/peacepad/server/aiHelper.ts, APPS/peacepad/tests/unit/cesEscalation.test.ts, and APPS/peacepad/docs/chat-mediator.md)";

const PROFANITY_TERMS = [
  "motherfucker",
  "bitch",
  "fuckface",
  "piece of shit",
  "bastard",
  "asshole",
  "shithead",
  "dickhead",
  "prick",
  "jackass",
  "scumbag",
  "trash bag",
  "garbage human",
  "son of a bitch",
  "little bitch",
  "fucking clown",
  "fucking liar",
  "fucking deadbeat",
  "fucking coward",
] as const;

const DIRECT_HOSTILE_PHRASES = [
  "fuck you",
  "fuck off",
  "shut the fuck up",
  "go to hell",
  "drop dead",
  "eat shit",
  "kiss my ass",
  "you can go to hell",
  "i'm sick of your shit",
  "i am sick of your shit",
  "you're full of shit",
  "you are full of shit",
  "what the hell is wrong with you",
  "you are a piece of shit",
  "you are such an asshole",
  "you are a motherfucker",
  "you bastard",
  "you asshole",
] as const;

const TARGETED_ATTACK_TEMPLATES = [
  "you are {term}",
  "you're {term}",
  "youre {term}",
  "you are such {term}",
  "you're such {term}",
  "youre such {term}",
  "what a {term}",
  "such a {term}",
  "stop being {term}",
  "you sound like {term}",
] as const;

const INSULT_NOUNS = [
  "idiot",
  "moron",
  "clown",
  "liar",
  "deadbeat",
  "coward",
  "fraud",
  "narcissist",
  "bully",
  "monster",
  "lunatic",
  "sociopath",
  "jerk",
  "snake",
  "manipulator",
  "parasite",
  "disaster",
  "nightmare",
  "control freak",
  "failure",
  "phony",
  "drama machine",
  "embarrassment",
  "mess",
] as const;

const INSULT_ADJECTIVES = [
  "stupid",
  "pathetic",
  "worthless",
  "useless",
  "selfish",
  "toxic",
  "lazy",
  "delusional",
  "disgusting",
  "immature",
  "unstable",
  "unreliable",
  "cruel",
  "petty",
  "ridiculous",
  "insufferable",
  "desperate",
  "embarrassing",
  "heartless",
] as const;

const ADJECTIVE_ATTACK_TEMPLATES = [
  "you are {term}",
  "you're {term}",
  "youre {term}",
  "you are so {term}",
  "you're so {term}",
  "youre so {term}",
  "acting so {term}",
  "always so {term}",
  "that was {term} of you",
  "that was so {term} of you",
] as const;

const PARENTING_INSULTS = [
  "terrible parent",
  "bad parent",
  "unfit parent",
  "awful mother",
  "awful father",
  "terrible co parent",
  "terrible coparent",
  "deadbeat parent",
  "lazy parent",
  "selfish parent",
] as const;

const PARENTING_ATTACK_TEMPLATES = [
  "you are a {term}",
  "you're a {term}",
  "youre a {term}",
  "such a {term}",
] as const;

const ACCUSATION_ALWAYS_TARGETS = [
  "forget pickup",
  "forget dropoff",
  "forget the kids",
  "ignore the kids",
  "ignore my messages",
  "lie",
  "make everything harder",
  "miss pickups",
  "make excuses",
  "start drama",
  "break your word",
  "show up late",
  "cancel last minute",
  "change the plan",
  "cause problems",
] as const;

const ACCUSATION_NEVER_TARGETS = [
  "listen",
  "help",
  "care",
  "show up",
  "follow through",
  "take responsibility",
  "communicate clearly",
  "keep your word",
  "do your part",
  "answer on time",
  "make this easier",
  "respect boundaries",
  "think about the kids",
  "support anyone but yourself",
  "plan ahead",
] as const;

const ACCUSATION_ALWAYS_TEMPLATES = [
  "you always {term}",
  "as usual you {term}",
  "you keep {term}",
  "you constantly {term}",
] as const;

const ACCUSATION_NEVER_TEMPLATES = [
  "you never {term}",
  "you still never {term}",
  "you just never {term}",
  "you never even {term}",
] as const;

const BLAME_PHRASES = [
  "this is your fault",
  "because of you",
  "thanks to you",
  "you caused this",
  "you did this",
  "you made this happen",
  "this mess is on you",
  "this problem started with you",
  "you brought this on yourself",
  "you made everything worse",
  "you turned this into a mess",
  "you ruined this again",
  "you are late again",
  "as usual you are late again",
  "you are always late",
  "you keep showing up late",
  "you always pick up the kid late",
  "you always pick up the kids late",
  "you always show up late for pickup",
] as const;

const PRESSURE_ACTIONS = [
  "send the money today",
  "answer me right now",
  "fix this today",
  "do what i said",
  "agree to this now",
  "stop arguing and comply",
  "make the payment now",
  "change your plans now",
  "drop this off today",
  "pick them up on time",
  "sign this today",
  "tell me yes right now",
] as const;

const PRESSURE_TEMPLATES = [
  "you better {term}",
  "you need to {term}",
  "you have to {term}",
  "you must {term}",
  "last chance to {term}",
  "either you {term}",
] as const;

const LEGAL_THREAT_ACTIONS = [
  "take you to court",
  "call my lawyer",
  "file for custody",
  "get a court order",
  "make this a legal issue",
  "document this for court",
  "tell my lawyer everything",
  "push this through court",
  "go for full custody",
  "keep the kids from you",
] as const;

const LEGAL_THREAT_TEMPLATES = [
  "i'll {term}",
  "i will {term}",
  "i'm going to {term}",
  "im going to {term}",
  "keep this up and i'll {term}",
  "if you do this again i'll {term}",
] as const;

const ESCALATION_ENDINGS = [
  "this is getting ridiculous",
  "i'm done with this",
  "i am done with this",
  "i'm done with you",
  "i am done with you",
  "i'm sick of this",
  "i am sick of this",
  "i'm sick of your nonsense",
  "i am sick of your nonsense",
  "i can't do this anymore",
  "i cant do this anymore",
  "this is exhausting",
] as const;

const ESCALATION_OPENERS = [
  "honestly",
  "seriously",
  "at this point",
  "once again",
  "as usual",
  "frankly",
  "i swear",
  "right now",
] as const;

const FRUSTRATION_TARGETS = [
  "i'm really frustrated",
  "i am really frustrated",
  "i'm frustrated",
  "i am frustrated",
] as const;

const FRUSTRATION_CONTEXT_PREFIXES = [
  "again",
  "once again",
  "at this point",
  "right now",
] as const;

const FRUSTRATION_CONTEXT_SUFFIXES = [
  "you always",
  "you never",
] as const;

const EMOTIONAL_ENDINGS = [
  "this nonsense",
  "this mess",
  "your excuses",
  "the drama",
  "your behavior",
  "this situation",
  "your attitude",
  "the lies",
  "the delays",
  "this chaos",
  "how you act",
  "doing all the work",
] as const;

const EMOTIONAL_OPENERS = [
  "i'm tired of",
  "i am tired of",
  "i'm so tired of",
  "i am so tired of",
  "i'm fed up with",
  "i am fed up with",
] as const;

const DISMISSIVE_DIRECT_PHRASES = [
  "whatever",
  "spare me",
  "save it",
  "not my problem",
  "i don't care what you think",
  "i dont care what you think",
  "leave me alone",
  "stop texting me",
  "you're not worth replying to",
  "you are not worth replying to",
  "grow up",
  "get over yourself",
  "i'm ignoring you",
  "im ignoring you",
  "i'm done responding",
  "im done responding",
  "that's not my problem",
  "thats not my problem",
  "figure it out yourself",
  "deal with it yourself",
  "you are on your own",
  "you're on your own",
  "youre on your own",
  "shut up",
  "stop talking",
] as const;

const TAUNT_PHRASES = [
  "your mama",
  "yo mama",
  "ya mama",
  "ya papa",
] as const;

const PROFESSIONAL_DISMISSIVE_PHRASES = [
  "do your job",
  "use common sense",
  "get it together",
  "stop wasting my time",
  "this is amateur",
  "you should know better",
] as const;

const PROFESSIONAL_BLAME_PHRASES = [
  "you're costing us this deal",
  "you are costing us this deal",
  "you're making us lose the client",
  "you are making us lose the client",
  "you're making us lose the vendor",
  "you are making us lose the vendor",
  "this is why deals fall apart",
] as const;

const PROFESSIONAL_PRESSURE_PHRASES = [
  "fix this right now",
  "if you can't handle this",
  "if you cant handle this",
  "i'll go with another agent",
  "i will go with another agent",
  "i'll go with another vendor",
  "i will go with another vendor",
] as const;

const URGENCY_PRESSURE_PHRASES = [
  "answer me now",
] as const;

const CHILD_DIRECTED_ATTACK_PHRASES = [
  "you never care about the kids",
  "you never care about your kids",
  "you never care about the children",
  "you do not care about the kids",
  "you don't care about the kids",
  "you only care about yourself and not the kids",
  "you keep hurting the kids with this",
] as const;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPhrasePattern(phrase: string): RegExp {
  const tokens = normalizeText(phrase)
    .split(" ")
    .filter(Boolean)
    .map((token) => escapeRegex(token));

  if (tokens.length === 0) {
    return /$^/;
  }

  return new RegExp(`\\b${tokens.join("\\s+")}\\b`);
}

function buildTemplatePhrases(
  templates: readonly string[],
  terms: readonly string[],
): string[] {
  const phrases: string[] = [];
  for (const template of templates) {
    for (const term of terms) {
      phrases.push(template.replaceAll("{term}", term));
    }
  }
  return phrases;
}

function buildJoinedPhrases(
  openers: readonly string[],
  endings: readonly string[],
): string[] {
  const phrases: string[] = [];
  for (const opener of openers) {
    for (const ending of endings) {
      phrases.push(`${opener} ${ending}`);
    }
  }
  return phrases;
}

function dedupeSeeds(seeds: LocalRuleSeed[]): LocalRuleSeed[] {
  const seen = new Set<string>();
  const unique: LocalRuleSeed[] = [];

  for (const seed of seeds) {
    const normalizedPhrase = normalizeText(seed.phrase);
    const key = [seed.severity, seed.code, normalizedPhrase, seed.description].join("|");
    if (!normalizedPhrase || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push({ ...seed, phrase: normalizedPhrase });
  }

  return unique;
}

function createDataset(): LocalRuleSeed[] {
  const seeds: LocalRuleSeed[] = [];
  const pushPhrases = (
    phrases: readonly string[] | string[],
    config: Omit<LocalRuleSeed, "phrase">,
  ): void => {
    for (const phrase of phrases) {
      seeds.push({ phrase, ...config });
    }
  };

  pushPhrases(PROFANITY_TERMS, {
    group: "profanity",
    severity: "strong",
    code: "hostile_language",
    category: "linguistic",
    weight: 40,
    description: "Direct profanity detected",
    moderationFlag: "profanity",
  });

  pushPhrases(DIRECT_HOSTILE_PHRASES, {
    group: "hostility",
    severity: "strong",
    code: "hostile_language",
    category: "linguistic",
    weight: 42,
    description: "Profanity or direct hostile language detected",
    moderationFlag: "profanity",
  });

  pushPhrases(buildTemplatePhrases(TARGETED_ATTACK_TEMPLATES, PROFANITY_TERMS), {
    group: "profanity",
    severity: "strong",
    code: "hostile_language",
    category: "linguistic",
    weight: 36,
    description: "Directed profanity attack detected",
    moderationFlag: "harassment",
  });

  pushPhrases(buildTemplatePhrases(TARGETED_ATTACK_TEMPLATES, INSULT_NOUNS), {
    group: "insult",
    severity: "strong",
    code: "dismissive_attack",
    category: "linguistic",
    weight: 28,
    description: "Direct personal insult detected",
    moderationFlag: "harassment",
  });

  pushPhrases(buildTemplatePhrases(ADJECTIVE_ATTACK_TEMPLATES, INSULT_ADJECTIVES), {
    group: "insult",
    severity: "strong",
    code: "dismissive_attack",
    category: "linguistic",
    weight: 26,
    description: "Belittling personal attack detected",
    moderationFlag: "harassment",
  });

  pushPhrases(TAUNT_PHRASES, {
    group: "taunt",
    severity: "mild",
    code: "dismissive_attack",
    category: "linguistic",
    weight: 12,
    description: "Taunting put-down detected",
  });

  pushPhrases(buildTemplatePhrases(PARENTING_ATTACK_TEMPLATES, PARENTING_INSULTS), {
    group: "parenting",
    severity: "strong",
    code: "dismissive_attack",
    category: "linguistic",
    weight: 30,
    description: "Direct parenting insult detected",
    moderationFlag: "harassment",
  });

  pushPhrases(buildTemplatePhrases(ACCUSATION_ALWAYS_TEMPLATES, ACCUSATION_ALWAYS_TARGETS), {
    group: "accusatory",
    severity: "mild",
    code: "accusatory",
    category: "linguistic",
    weight: 10,
    description: "Pattern accusation detected",
  });

  pushPhrases(buildTemplatePhrases(ACCUSATION_NEVER_TEMPLATES, ACCUSATION_NEVER_TARGETS), {
    group: "accusatory",
    severity: "mild",
    code: "accusatory",
    category: "linguistic",
    weight: 10,
    description: "Pattern accusation detected",
  });

  pushPhrases(BLAME_PHRASES, {
    group: "accusatory",
    severity: "mild",
    code: "accusatory",
    category: "linguistic",
    weight: 9,
    description: "Direct blame statement detected",
  });

  pushPhrases(PROFESSIONAL_BLAME_PHRASES, {
    group: "professional_risk",
    severity: "mild",
    code: "accusatory",
    category: "linguistic",
    weight: 12,
    description: "Deal-risk blame statement detected",
  });

  pushPhrases(CHILD_DIRECTED_ATTACK_PHRASES, {
    group: "hostility",
    severity: "strong",
    code: "dismissive_attack",
    category: "contextual",
    weight: 28,
    description: "Child-directed personal attack detected",
    moderationFlag: "harassment",
  });

  pushPhrases(buildTemplatePhrases(PRESSURE_TEMPLATES, PRESSURE_ACTIONS), {
    group: "threat",
    severity: "strong",
    code: "pressure_control",
    category: "behavioral",
    weight: 20,
    description: "Ultimatum or pressure language detected",
    moderationFlag: "threat",
  });

  pushPhrases(PROFESSIONAL_PRESSURE_PHRASES, {
    group: "professional_risk",
    severity: "mild",
    code: "pressure_control",
    category: "behavioral",
    weight: 12,
    description: "Professional pressure or ultimatum detected",
  });

  pushPhrases(URGENCY_PRESSURE_PHRASES, {
    group: "urgency_pressure",
    severity: "mild",
    code: "pressure_control",
    category: "behavioral",
    weight: 11,
    description: "Urgency pressure detected",
  });

  pushPhrases(buildTemplatePhrases(LEGAL_THREAT_TEMPLATES, LEGAL_THREAT_ACTIONS), {
    group: "threat",
    severity: "strong",
    code: "legal_escalation",
    category: "contextual",
    weight: 24,
    description: "Legal or custody threat detected",
    moderationFlag: "threat",
  });

  pushPhrases(buildJoinedPhrases(ESCALATION_OPENERS, ESCALATION_ENDINGS), {
    group: "escalation",
    severity: "mild",
    code: "emotional_charge",
    category: "linguistic",
    weight: 9,
    description: "Escalating frustration phrasing detected",
  });

  pushPhrases(buildJoinedPhrases(FRUSTRATION_CONTEXT_PREFIXES, FRUSTRATION_TARGETS), {
    group: "escalation",
    severity: "mild",
    code: "emotional_charge",
    category: "linguistic",
    weight: 8,
    description: "Contextual frustration phrasing detected",
  });

  pushPhrases(buildJoinedPhrases(FRUSTRATION_TARGETS, FRUSTRATION_CONTEXT_SUFFIXES), {
    group: "escalation",
    severity: "mild",
    code: "emotional_charge",
    category: "linguistic",
    weight: 8,
    description: "Contextual frustration phrasing detected",
  });

  pushPhrases(buildJoinedPhrases(EMOTIONAL_OPENERS, EMOTIONAL_ENDINGS), {
    group: "escalation",
    severity: "mild",
    code: "emotional_charge",
    category: "linguistic",
    weight: 8,
    description: "High emotional intensity detected",
  });

  pushPhrases(DISMISSIVE_DIRECT_PHRASES, {
    group: "dismissive",
    severity: "mild",
    code: "evasion",
    category: "behavioral",
    weight: 8,
    description: "Dismissive or evasive phrasing detected",
  });

  pushPhrases(PROFESSIONAL_DISMISSIVE_PHRASES, {
    group: "professional_risk",
    severity: "mild",
    code: "dismissive_attack",
    category: "linguistic",
    weight: 12,
    description: "Professional put-down detected",
  });

  return dedupeSeeds(seeds);
}

const LOCAL_RULESET_DATASET = createDataset();
export const LOCAL_RULESET_ENTRY_COUNT = LOCAL_RULESET_DATASET.length;

const STRONG_RULES: RuleDefinition[] = LOCAL_RULESET_DATASET
  .filter((seed) => seed.severity === "strong")
  .map((seed) => ({
    pattern: buildPhrasePattern(seed.phrase),
    group: seed.group,
    code: seed.code,
    category: seed.category,
    weight: seed.weight,
    description: seed.description,
    moderationFlag: seed.moderationFlag,
  }));

const MILD_RULES: RuleDefinition[] = LOCAL_RULESET_DATASET
  .filter((seed) => seed.severity === "mild")
  .map((seed) => ({
    pattern: buildPhrasePattern(seed.phrase),
    group: seed.group,
    code: seed.code,
    category: seed.category,
    weight: seed.weight,
    description: seed.description,
    moderationFlag: seed.moderationFlag,
  }));

const REDUCTION_RULES: ReductionRule[] = [
  {
    pattern: /\bthank\s+you\b|\bthanks\b/,
    code: "collaborative_language",
    category: "behavioral",
    reduction: 10,
    description: "Expression of gratitude",
  },
  {
    pattern: /\bcould\s+we\b|\bcan\s+we\b/,
    code: "collaborative_language",
    category: "behavioral",
    reduction: 8,
    description: "Collaborative request",
  },
  {
    pattern: /\bplease\s+let\s+me\s+know\b|\bwhat\s+works\s+best\b|\bwhat\s+do\s+you\s+think\b/,
    code: "collaborative_language",
    category: "behavioral",
    reduction: 9,
    description: "Seeking input respectfully",
  },
  {
    pattern: /\blet(?:'|’)s\s+(work|figure|sort)\s+(this\s+)?out\b|\bi\s+understand\b|\bi\s+hear\s+you\b/,
    code: "collaborative_language",
    category: "behavioral",
    reduction: 12,
    description: "Collaborative framing",
  },
  {
    pattern: /\bfor\s+the\s+(kids?|children)\b|\bfor\s+our\s+(kids?|children)\b/,
    code: "child_focus",
    category: "contextual",
    reduction: 8,
    description: "Child-focused framing",
  },
];

const SENSITIVE_CONTEXT_PATTERN =
  /\b(lawyer|court|custody|support|money|payment|pay|paid|school\s*supplies?|expenses?|pickup|pick up|dropoff|drop off|late)\b/;

const CHILD_CONTEXT_PATTERN =
  /\b(kids?|children|son|daughter|school\s*supplies?|pickup|pick up|dropoff|drop off)\b/;

const BUSINESS_CONTEXT_PATTERN =
  /\b(agent|buyer|seller|client|vendor|deal|listing|offer|closing|contract|realtor)\b/;

const SIMPLE_SAFE_PATTERN =
  /\b(hi|hello|hey|outside|on\s+my\s+way|please|thanks|tomorrow|today|pick(?:ing)?\s+(him|her|them)\s+up|drop(?:ping)?\s+(him|her|them)\s+off)\b/;

function addSignal(
  state: EvaluationState,
  rule: RuleDefinition,
  overrideWeight?: number,
): void {
  const signalKey = `${rule.code}:${rule.description}:${rule.pattern.source}`;
  if (state.matchedCodes.has(signalKey)) {
    return;
  }

  state.matchedCodes.add(signalKey);
  state.matchedGroups.add(rule.group);
  state.score += overrideWeight ?? rule.weight;
  state.signals.push({
    category: rule.category,
    code: rule.code,
    weight: overrideWeight ?? rule.weight,
    description: rule.description,
  });
  if (rule.moderationFlag) {
    state.moderationFlags.add(rule.moderationFlag);
  }
}

function addContextualSignals(state: EvaluationState): void {
  const text = state.normalized;
  const targetedStupidPattern =
    /\b(?:you\s+are\s+stupid|you'?re\s+stupid|youre\s+stupid|that\s+was\s+(?:so\s+)?stupid\s+of\s+you)\b/;

  if (/\bstupid\b/.test(text) && !targetedStupidPattern.test(text)) {
    addSignal(state, {
      pattern: /\bstupid\b/,
      group: "insult",
      code: "dismissive_attack",
      category: "linguistic",
      weight: 12,
      description: "Belittling phrasing detected",
    });
  }
}

function hasPositiveSignal(state: EvaluationState, ...codes: string[]): boolean {
  return state.signals.some((signal) => signal.weight > 0 && codes.includes(signal.code));
}

function hasPositiveSignalDescription(state: EvaluationState, pattern: RegExp): boolean {
  return state.signals.some(
    (signal) => signal.weight > 0 && pattern.test(signal.description.toLowerCase()),
  );
}

function generateProfessionalCalmVersion(text: string): string | null {
  if (
    /\byou(?:'|’)re\s+costing\s+us\s+this\s+deal\b|\byou\s+are\s+costing\s+us\s+this\s+deal\b|\bthis\s+is\s+why\s+deals\s+fall\s+apart\b/.test(text)
  ) {
    return "I'm concerned this could affect the deal. Can we align on the next step so we keep it moving?";
  }

  if (/\bmaking\s+us\s+lose\s+the\s+client\b/.test(text)) {
    return "I'm concerned this could affect the client relationship. Can we align on the next step so we keep things moving professionally?";
  }

  if (/\bmaking\s+us\s+lose\s+the\s+vendor\b/.test(text)) {
    return "I'm concerned this could affect the vendor relationship. Can we align on the next step so we keep things moving professionally?";
  }

  if (/\bstop\s+wasting\s+my\s+time\b|\banswer\s+me\s+now\b|\bfix\s+this\s+right\s+now\b/.test(text)) {
    return "Can you send me an update as soon as possible so we can keep this moving?";
  }

  if (
    /\bdo\s+your\s+job\b|\buse\s+common\s+sense\b|\bget\s+it\s+together\b|\bthis\s+is\s+amateur\b|\byou\s+should\s+know\s+better\b/.test(text)
  ) {
    return "Can we reset on expectations and confirm the next step so we stay aligned?";
  }

  if (
    /\bi(?:'|’)ll\s+go\s+with\s+another\s+agent\b|\bi\s+will\s+go\s+with\s+another\s+agent\b|\bi(?:'|’)ll\s+go\s+with\s+another\s+vendor\b|\bi\s+will\s+go\s+with\s+another\s+vendor\b/.test(text)
  ) {
    return "If this timeline is not workable, let's clarify responsibilities and next steps so we can decide how to move forward professionally.";
  }

  if (/\bya\s+(?:mama|papa)\b|\byo\s+mama\b|\byour\s+mama\b/.test(text)) {
    return "Let's keep this professional and focus on the issue we need to resolve.";
  }

  if (/\bthis\s+is\s+stupid\b|\bstupid\b/.test(text)) {
    return "I don't think this approach is working. Can we revisit the next step and keep this moving?";
  }

  return null;
}

function generateHostilityCalmVersion(text: string): string {
  if (
    /\bfuck\s+you\b|\bfuck\s+off\b|\bshut\s+the\s+fuck\s+up\b|\bgo\s+to\s+hell\b|\bdrop\s+dead\b/.test(text)
  ) {
    return "I want to keep this professional. Can we pause and focus on the next step?";
  }

  if (/\bbitch\b|\basshole\b|\bbastard\b|\bmotherfucker\b/.test(text)) {
    return "I want to keep this professional. Can we reset and focus on the issue we need to resolve?";
  }

  if (/\byou\s+are\s+stupid\b|\byou'?re\s+stupid\b|\byoure\s+stupid\b/.test(text)) {
    return "I don't think this tone will help us solve it. Can we reset and focus on the next step?";
  }

  return "I want to keep this professional. Can we pause and focus on the next step?";
}

function addReduction(state: EvaluationState, rule: ReductionRule): void {
  const signalKey = `${rule.code}:${rule.description}`;
  if (state.matchedCodes.has(signalKey)) {
    return;
  }

  state.matchedCodes.add(signalKey);
  state.score = Math.max(0, state.score - rule.reduction);
  state.positiveSignals += 1;
  state.signals.push({
    category: rule.category,
    code: rule.code,
    weight: -rule.reduction,
    description: rule.description,
  });
}

function addDynamicSignals(state: EvaluationState, originalText: string): void {
  if (/!{2,}|\?{2,}|!\?|\?!/.test(originalText)) {
    addSignal(state, {
      pattern: /!/, 
      group: "escalation",
      code: "emotional_charge",
      category: "linguistic",
      weight: 6,
      description: "Escalating punctuation detected",
    });
  }

  const letters = originalText.replace(/[^a-z]/gi, "");
  const upperLetters = originalText.replace(/[^A-Z]/g, "");
  if (letters.length >= 8 && upperLetters.length / Math.max(letters.length, 1) >= 0.65) {
    addSignal(state, {
      pattern: /[A-Z]/,
      group: "escalation",
      code: "emotional_charge",
      category: "linguistic",
      weight: 12,
      description: "All-caps emphasis detected",
    });
  }
}

function generateLocalCalmVersion(state: EvaluationState): string | null {
  const text = state.normalized;
  const hasHostility =
    state.moderationFlags.has("profanity") ||
    state.moderationFlags.has("harassment") ||
    hasPositiveSignal(state, "dismissive_attack");
  const hasThreat = state.moderationFlags.has("threat");
  const hasAccusation = hasPositiveSignal(state, "accusatory");
  const hasPressure = hasPositiveSignal(state, "pressure_control");
  const hasEmotionalCharge = hasPositiveSignal(state, "emotional_charge");
  const hasProfessionalRisk =
    state.matchedGroups.has("professional_risk") ||
    state.matchedGroups.has("taunt") ||
    state.businessContext;
  const hasDealRisk = hasPositiveSignalDescription(state, /deal-risk/i);

  if (hasThreat) {
    return state.childContext
      ? "I'd like to resolve this calmly. Can we agree on the next step for the kids without escalating it further right now?"
      : "I'd like to keep this constructive. Can we agree on the next step without escalating the conversation?";
  }

  if (/\bpickup|pick up|dropoff|drop off\b/.test(text) && /\blate\b/.test(text)) {
    return "Pickup has been running late recently. Can we keep it closer to the agreed time so the routine stays consistent?";
  }

  if (/\byou\s+never\s+care\s+about\s+(the\s+)?(kids?|children|them)\b/.test(text)) {
    return "I'm worried about consistency for the kids. Can we focus on what they need right now and agree on the next step?";
  }

  if (state.childContext && hasHostility) {
    return "I'm upset right now. Let's pause and focus on what needs to happen for the kids.";
  }

  if (hasProfessionalRisk) {
    const professionalVersion = generateProfessionalCalmVersion(text);
    if (professionalVersion) {
      return professionalVersion;
    }
  }

  if (hasDealRisk) {
    return "I want to keep this moving professionally. Can we align on the next step so the deal stays on track?";
  }

  if (hasProfessionalRisk && hasPressure) {
    return "I want to keep this constructive. Can we align on the next step and keep communication clear?";
  }

  if (hasProfessionalRisk && hasAccusation) {
    return "I want to keep this professional. Can we focus on the issue and agree on the next step?";
  }

  if (hasProfessionalRisk) {
    return "I want to keep this professional. Can we restate the issue clearly and agree on the next step?";
  }

  if (/\btired\s+of\s+reminding\b|\bas\s+usual\b.*\blate\b|\blate\s+again\b/.test(text)) {
    return "I've had to follow up a few times. Can we agree on a clear plan going forward?";
  }

  if (hasAccusation) {
    return state.businessContext
      ? "I want to keep this constructive. Can we focus on the issue and agree on the next step?"
      : "I'm concerned about this pattern. Can we reset expectations and focus on a workable plan?";
  }

  if (hasHostility) {
    return state.businessContext
      ? "I'm frustrated with how this is going. Can we reset and focus on the next step to keep this moving professionally?"
      : generateHostilityCalmVersion(text);
  }

  if (hasEmotionalCharge) {
    return state.childContext
      ? "I'm finding this frustrating. Can we slow this down and focus on the next step for the kids?"
      : "I'm finding this frustrating. Can we slow this down and focus on the next step?";
  }

  return state.businessContext
    ? "Can we keep this professional and align on the next step together?"
    : "Can we focus on the issue and work out a clear plan together?";
}

function buildResponse(
  classification: "safe" | "mild" | "strong",
  state: EvaluationState,
): PreflightResponse {
  const conflictScore = classification === "safe"
    ? Math.min(state.score, 12)
    : classification === "mild"
      ? Math.max(35, Math.min(state.score * 3, 64))
      : Math.max(75, Math.min(state.score * 2, 96));

  const riskLevel: RiskLevel = classification === "safe"
    ? "low"
    : classification === "mild"
      ? "medium"
      : state.moderationFlags.has("threat")
        ? "critical"
        : "high";

  const calmVersion = classification === "safe" ? null : generateLocalCalmVersion(state);
  const recommendation = classification === "safe"
    ? "send_as_is"
    : classification === "mild"
      ? "review_and_rewrite"
      : "pause_before_send";

  return {
    conflict_score: conflictScore,
    risk_level: riskLevel,
    signals: state.signals,
    moderation_flags: Array.from(state.moderationFlags),
    recommendation,
    calm_version: calmVersion,
    send_policy: {
      allow_send_original: true,
      requires_acknowledgement: classification === "strong",
      recommended_action: recommendation,
      pause_minutes: classification === "strong" ? (state.moderationFlags.has("threat") ? 20 : 10) : null,
    },
    model_or_ruleset_version: {
      contract: CONTRACT_VERSION,
      tone_model: "local-rules",
      escalation_ruleset: LOCAL_RULESET_VERSION,
    },
    source: {
      tone: classification === "safe" ? "neutral" : classification === "mild" ? "frustrated" : "hostile",
      summary: `local rule matched: ${classification}`,
    },
  };
}

export function evaluateLocalPreflight(input: AnalyzeMessageRequest): LocalPreflightDecision {
  const normalized = normalizeText(input.text || "");
  const state: EvaluationState = {
    normalized,
    score: 0,
    signals: [],
    moderationFlags: new Set<string>(),
    matchedCodes: new Set<string>(),
    matchedGroups: new Set<LocalRuleGroup>(),
    positiveSignals: 0,
    sensitiveContext: SENSITIVE_CONTEXT_PATTERN.test(normalized),
    childContext: CHILD_CONTEXT_PATTERN.test(normalized),
    businessContext: BUSINESS_CONTEXT_PATTERN.test(normalized),
  };

  if (!normalized) {
    return {
      kind: "resolved",
      classification: "safe",
      response: buildResponse("safe", state),
    };
  }

  for (const rule of STRONG_RULES) {
    if (rule.pattern.test(normalized)) {
      addSignal(state, rule);
    }
  }

  for (const rule of MILD_RULES) {
    if (rule.pattern.test(normalized)) {
      addSignal(state, rule);
    }
  }

  addContextualSignals(state);

  for (const rule of REDUCTION_RULES) {
    if (rule.pattern.test(normalized)) {
      addReduction(state, rule);
    }
  }

  addDynamicSignals(state, input.text);

  const hasStrongModeration = state.moderationFlags.size > 0;
  const hasStrongScore = state.score >= 24;
  const hasMildScore = state.score >= 8;
  const lowScore = state.score <= 2;
  const uncertaintyBand = state.score > 2 && state.score < 8;
  const conflictingSignals = state.positiveSignals > 0 && state.signals.some((signal) => signal.weight > 0);
  const simpleSafe = SIMPLE_SAFE_PATTERN.test(normalized);

  if (hasStrongModeration || hasStrongScore) {
    return {
      kind: "resolved",
      classification: "strong",
      response: buildResponse("strong", state),
    };
  }

  if (hasMildScore && !(state.sensitiveContext && state.childContext && conflictingSignals)) {
    return {
      kind: "resolved",
      classification: "mild",
      response: buildResponse("mild", state),
    };
  }

  if ((lowScore && !state.sensitiveContext) || (!state.signals.length && simpleSafe) || (!state.signals.length && !state.sensitiveContext)) {
    return {
      kind: "resolved",
      classification: "safe",
      response: buildResponse("safe", state),
    };
  }

  if (uncertaintyBand || conflictingSignals || (state.sensitiveContext && state.childContext)) {
    return {
      kind: "fallback",
      classification: "ambiguous",
      reason: "local rule score ambiguous, using api fallback",
      score: state.score,
      signals: state.signals,
    };
  }

  return {
    kind: "resolved",
    classification: "safe",
    response: buildResponse("safe", state),
  };
}

