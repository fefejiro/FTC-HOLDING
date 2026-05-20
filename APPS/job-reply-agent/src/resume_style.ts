import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export interface TailoredResumeContent {
  targetTitle: string;
  subtitle: string;
  summaryBullets: string[];
  coreStrengths: string[];
  experienceBullets: string[];
  portfolioBullets: string[];
  track: string;
  needsReview: boolean;
  needsReviewReasons: string[];
}

interface TruthTrack {
  keywords?: string[];
  subtitle?: string;
  summary_templates?: string[];
  core_strengths?: string[];
}

interface ExperienceItem {
  text: string;
  tags?: string[];
}

interface TruthBank {
  tracks?: Record<string, TruthTrack>;
  experience_pool?: ExperienceItem[];
  portfolio?: string[];
}

interface ScoringRules {
  contamination_terms?: string[];
  unsupported_claim_patterns?: string[];
}

const DEFAULT_CONTAMINATION_TERMS = ["WMS Project Manager", "Blue Yonder", "North West Company"];
const DEFAULT_UNSUPPORTED_PATTERNS = [
  /\bteam of\s+\d+/i,
  /\bbudget(?:s)?\b/i,
  /\bdistribution center(?:s)?\b/i,
  /\bclient count(?:s)?\b/i,
  /\bmrr\b/i,
  /\bpricing ownership\b/i,
  /\bgross margin\b/i,
  /\bnet margin\b/i,
  /\bp&l\b/i,
  /\bu\.?s\.? citizen\b/i,
  /\bgreen card\b/i,
  /\bsecurity clearance\b/i
];

let cachedTruthBank: TruthBank | null = null;
let cachedScoringRules: ScoringRules | null = null;

function loadYaml<T>(fileName: string): T | null {
  const filePath = path.join(process.cwd(), "config", fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return YAML.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function getTruthBank(): TruthBank {
  if (cachedTruthBank) return cachedTruthBank;
  cachedTruthBank = loadYaml<TruthBank>("profile_truth_bank.yaml") || {};
  return cachedTruthBank;
}

function getScoringRules(): ScoringRules {
  if (cachedScoringRules) return cachedScoringRules;
  cachedScoringRules = loadYaml<ScoringRules>("scoring_rules.yaml") || {};
  return cachedScoringRules;
}

function clean(input: string): string {
  return input.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTitle(title: string): string {
  return clean(title).replace(/[\u2013\u2014]/g, "-");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function scoreTrack(track: TruthTrack | undefined, tokens: Set<string>): number {
  if (!track?.keywords?.length) return 0;
  let score = 0;
  for (const keyword of track.keywords) {
    const keywordTokens = tokenize(keyword);
    if (keywordTokens.length === 0) continue;
    if (keywordTokens.every((token) => tokens.has(token))) {
      score += keywordTokens.length + 2;
    } else if (keywordTokens.some((token) => tokens.has(token))) {
      score += 1;
    }
  }
  return score;
}

function detectTrack(title: string, company: string, jdText: string, truthBank: TruthBank): string {
  const corpus = `${title}\n${company}\n${jdText}`;
  const tokens = new Set(tokenize(corpus));
  const tracks = truthBank.tracks || {};

  let bestTrack = "enterprise_delivery";
  let bestScore = -1;

  for (const [trackName, track] of Object.entries(tracks)) {
    const score = scoreTrack(track, tokens);
    if (score > bestScore) {
      bestScore = score;
      bestTrack = trackName;
    }
  }

  return bestTrack;
}

function fillTemplate(template: string, title: string, company: string): string {
  const value = String(template || "");
  return clean(
    value
      .replace(/\{title\}/g, title)
      .replace(/\{company\}/g, company)
  );
}

function pickExperienceBullets(track: string, jdText: string, experiencePool: ExperienceItem[]): string[] {
  const jdTokens = new Set(tokenize(jdText));
  const scored = experiencePool
    .map((item) => {
      const tags = item.tags || [];
      const textTokens = tokenize(item.text);
      let score = 0;
      if (track === "retail_analytics" && tags.includes("retail")) score += 3;
      if (track === "azure_cloud" && (tags.includes("cloud") || tags.includes("architecture"))) score += 3;
      if (tags.includes("delivery")) score += 1;
      for (const token of textTokens) {
        if (jdTokens.has(token)) score += 1;
      }
      return { text: clean(item.text), score };
    })
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, 8).map((item) => item.text);
  return [...new Set(selected)].slice(0, 8);
}

function checkContamination(text: string, jdText: string, scoringRules: ScoringRules): string[] {
  const reasons: string[] = [];
  const lowerText = text.toLowerCase();
  const lowerJd = jdText.toLowerCase();
  const terms = (scoringRules.contamination_terms || DEFAULT_CONTAMINATION_TERMS).map((term) => term.trim()).filter(Boolean);

  for (const term of terms) {
    if (lowerText.includes(term.toLowerCase()) && !lowerJd.includes(term.toLowerCase())) {
      reasons.push(`contamination term present without JD support: ${term}`);
    }
  }

  const patternSources = scoringRules.unsupported_claim_patterns || [];
  const patterns = [
    ...DEFAULT_UNSUPPORTED_PATTERNS,
    ...patternSources
      .map((source) => {
        try {
          return new RegExp(source, "i");
        } catch {
          return null;
        }
      })
      .filter((value): value is RegExp => Boolean(value))
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      reasons.push(`unsupported claim pattern detected: ${pattern.source}`);
    }
  }

  return reasons;
}

export function buildTailoredResumeContent(args: {
  roleTitle: string;
  company: string;
  jdText: string;
}): TailoredResumeContent {
  const roleTitle = normalizeTitle(args.roleTitle || "");
  const company = clean(args.company || "");
  const jdText = clean(args.jdText || "");

  const needsReviewReasons: string[] = [];
  if (!roleTitle) {
    needsReviewReasons.push("missing role title");
  }
  if (!company) {
    needsReviewReasons.push("missing company");
  }

  const truthBank = getTruthBank();
  const scoringRules = getScoringRules();
  const track = detectTrack(roleTitle, company, jdText, truthBank);
  const trackConfig = truthBank.tracks?.[track] || truthBank.tracks?.enterprise_delivery || {};

  const subtitle = clean(
    trackConfig.subtitle
      || "Enterprise Systems | Delivery Governance | Integration Execution | Operational Impact"
  );

  const summaryTemplates = trackConfig.summary_templates || [];
  const summaryBullets = (summaryTemplates.length > 0
    ? summaryTemplates.map((template) => fillTemplate(String(template), roleTitle, company))
    : [
        `${roleTitle} leader focused on structured delivery, measurable outcomes, and clear stakeholder communication.`,
        `Strong fit for ${company}: practical execution across enterprise systems, integrations, and release governance.`,
        "Known for reducing ambiguity, improving handoffs, and driving reliable implementation quality.",
        "Combines business translation with technical delivery discipline across complex environments.",
        "Portfolio includes practical implementation work across GitHub and Una Labs assets."
      ])
    .slice(0, 5);

  const coreStrengths = [...new Set((trackConfig.core_strengths || []).map((item) => clean(item)).filter(Boolean))].slice(0, 7);
  const experienceBullets = pickExperienceBullets(track, jdText, truthBank.experience_pool || []);
  const portfolioBullets = [...new Set((truthBank.portfolio || []).map((item) => clean(item)).filter(Boolean))].slice(0, 2);

  const joined = [
    roleTitle,
    subtitle,
    ...summaryBullets,
    ...coreStrengths,
    ...experienceBullets,
    ...portfolioBullets
  ].join("\n");

  needsReviewReasons.push(...checkContamination(joined, jdText, scoringRules));

  return {
    targetTitle: roleTitle,
    subtitle,
    summaryBullets,
    coreStrengths,
    experienceBullets,
    portfolioBullets,
    track,
    needsReview: needsReviewReasons.length > 0,
    needsReviewReasons
  };
}

export function buildTailoredCoverLetter(args: {
  roleTitle: string;
  company: string;
  jdText: string;
  profileName?: string;
  profileEmail?: string;
}): { text: string; needsReview: boolean; needsReviewReasons: string[] } {
  const content = buildTailoredResumeContent({
    roleTitle: args.roleTitle,
    company: args.company,
    jdText: args.jdText
  });

  const roleTitle = content.targetTitle;
  const company = clean(args.company);
  const strengths = content.coreStrengths.slice(0, 3).join(", ");
  const summaryFocus = content.summaryBullets[0] || "structured delivery and reliable execution";

  const text = [
    "Dear Hiring Team,",
    "",
    `I am applying for ${roleTitle} at ${company}. ${summaryFocus}`,
    "",
    `For this mandate, I would focus on ${strengths}. I work best where business outcomes, delivery governance, and implementation quality must stay aligned.`,
    "",
    "I would value the opportunity to discuss fit and immediate priorities.",
    "",
    "Sincerely,",
    args.profileName || "Fejiro Efiuvwere",
    args.profileEmail || "fejiro.efiuvwere@gmail.com"
  ].join("\n");

  return {
    text,
    needsReview: content.needsReview,
    needsReviewReasons: content.needsReviewReasons
  };
}

export function renderTailoredResumeText(content: TailoredResumeContent): string {
  return [
    `Target Title: ${content.targetTitle}`,
    `Subtitle: ${content.subtitle}`,
    "",
    "Summary",
    ...content.summaryBullets.map((bullet) => `- ${bullet}`),
    "",
    "Core Strengths",
    ...content.coreStrengths.map((item) => `- ${item}`),
    "",
    "Selected Experience Bullets",
    ...content.experienceBullets.map((bullet) => `- ${bullet}`),
    "",
    "Portfolio",
    ...content.portfolioBullets.map((bullet) => `- ${bullet}`)
  ].join("\n");
}
