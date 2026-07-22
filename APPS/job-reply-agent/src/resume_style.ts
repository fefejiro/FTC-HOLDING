import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export interface TailoredResumeContent {
  targetTitle: string;
  subtitle: string;
  summaryBullets: string[];
  coreStrengths: string[];
  experienceBullets: string[];
  experienceBulletRecords: TailoredExperienceBullet[];
  additionalAchievementBullets: string[];
  portfolioBullets: string[];
  track: string;
  needsReview: boolean;
  needsReviewReasons: string[];
  provenanceStats: ResumeProvenanceStats;
}

export interface ResumeBulletProvenance {
  source: string;
  employer: string;
  confidence: number;
  verified: boolean;
}

export interface TailoredExperienceBullet {
  text: string;
  tags: string[];
  score: number;
  provenance: ResumeBulletProvenance;
}

export interface ResumeProvenanceStats {
  selectedBulletCount: number;
  employerAttributedBulletCount: number;
  unattributedBulletCount: number;
  rejectedEmployerPlacementCount: number;
  fallbackBulletCount: number;
  placedEmployerBulletCount: number;
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
  source?: string;
  employer?: string;
  confidence?: number;
  verified?: boolean;
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
export const APPROVED_ORANGE_TEMPLATE_BASENAME = "Fejiro_Efiuvwere_Default_Job_Agent_Resume_Template_RQ11067.docx";
export const APPROVED_BUSINESS_ANALYST_TEMPLATE_BASENAME = "Business Systems Analyst - Fejiro Efiuvwere.docx";
export const APPROVED_BUSINESS_ANALYST_GOLDEN_TEMPLATE_BASENAME = "Business Systems Analyst - Fejiro Efiuvwere Golden Template.docx";
export const APPROVED_IT_MANAGEMENT_TEMPLATE_BASENAME = "IT Business Systems Manager Fejiro Efiuvwere.docx";
const APPROVED_ORANGE_TEMPLATE_BASENAMES = new Set([
  APPROVED_ORANGE_TEMPLATE_BASENAME.toLowerCase(),
  APPROVED_BUSINESS_ANALYST_TEMPLATE_BASENAME.toLowerCase(),
  APPROVED_BUSINESS_ANALYST_GOLDEN_TEMPLATE_BASENAME.toLowerCase(),
  APPROVED_IT_MANAGEMENT_TEMPLATE_BASENAME.toLowerCase(),
  "Fejiro_Efiuvwere_Business_Analyst_Gold_Standard_Template.docx".toLowerCase(),
  "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx".toLowerCase()
]);
export const FORBIDDEN_VISIBLE_RESUME_PHRASES = [
  "tailored",
  "target role alignment",
  "strong fit for",
  "based on the job description",
  "job agent",
  "application package"
] as const;
const FORBIDDEN_VISIBLE_RESUME_PATTERNS = [
  ...FORBIDDEN_VISIBLE_RESUME_PHRASES.map((phrase) => new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i")),
  /\bRQ\d+\b/i
];
const SALESFORCE_SIGNALS = /\b(salesforce|crm|service cloud|sales cloud|salesforce cpq|appbuilder|agentforce)\b/i;
const AZURE_CLOUD_SIGNALS = /\b(azure|cloud enterprise architect|landing zone|cloud migration|cloud governance|devsecops|enterprise architecture)\b/i;
const MAXIMO_EWMS_SIGNALS = /\b(maximo|ewms|enterprise work management|asset management|work orders?|preventative maintenance|preventive maintenance|service requests?|facilities maintenance|mobile field workflows?)\b/i;
const WMS_ERP_SUPPLY_CHAIN_SIGNALS = /\b(maximo|ewms|enterprise work management|wms|warehouse|warehouse management|erp|supply chain|logistics|inventory|distribution center|distribution centres?|fulfillment|blue yonder|manhattan|sap|oracle|pos integration|warehouse operations)\b/i;
const RETAIL_TECH_SIGNALS = /\b(pos|store systems|store operations|retail operations|merchandising|omni[- ]?channel|loyalty|retail technology)\b/i;
const PROJECT_PROGRAM_SIGNALS = /\b(project manager|program manager|delivery manager|pmo|portfolio|raid|risk register|budget|governance|executive reporting|implementation planning|release readiness)\b/i;
const BUSINESS_ANALYSIS_TITLE_SIGNALS = /\b(business analyst|systems analyst|business systems analyst|iit business analyst|i&it business analyst)\b/i;
const BUSINESS_ANALYSIS_DETAIL_SIGNALS = [
  /\brequirements?\b/i,
  /\bstakeholder/i,
  /\bcurrent[- ]state\b/i,
  /\bfuture[- ]state\b/i,
  /\bprocess mapping\b/i,
  /\buse cases?\b/i,
  /\buser stor(?:y|ies)\b/i,
  /\bacceptance criteria\b/i,
  /\bbacklog\b/i,
  /\bproduct owner\b/i,
  /\bagile\b/i,
  /\buat\b/i,
  /\baoda\b/i,
  /\binformation management\b/i
];
const PRODUCT_ECOMMERCE_BA_SIGNALS = /\b(saas|software as a service|e[- ]?commerce|ecommerce|shopify|marketplace|digital product|web platform|mobile app)\b/i;
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isApprovedOrangeTemplatePath(templatePath: string): boolean {
  return APPROVED_ORANGE_TEMPLATE_BASENAMES.has(path.basename(templatePath).toLowerCase());
}

export function sanitizeVisibleResumeText(input: string): string {
  let value = clean(input)
    .replace(/\bstrong fit for\b/gi, "Experienced with")
    .replace(/\bbased on the job description\b/gi, "for the role")
    .replace(/\btarget role alignment\b/gi, "Professional Summary")
    .replace(/\bapplication package\b/gi, "resume")
    .replace(/\bjob agent\b/gi, "workflow")
    .replace(/\btailored\b/gi, "role-focused")
    .replace(/\bRQ\d+\b/gi, "")
    .replace(/\s+([:;,.])/g, "$1");

  value = value.replace(/\s{2,}/g, " ").trim();
  return value;
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
  if (BUSINESS_ANALYSIS_TITLE_SIGNALS.test(title)) {
    return "business_analysis";
  }
  if (/\b(wms|warehouse|erp|supply chain|logistics|inventory|fulfillment)\b/i.test(title)) {
    return "wms_erp_supply_chain";
  }
  if (SALESFORCE_SIGNALS.test(corpus)) {
    return "salesforce_crm_delivery";
  }
  if (AZURE_CLOUD_SIGNALS.test(corpus)) {
    return "azure_cloud";
  }
  if (/\b(project manager|program manager|delivery manager|pmo)\b/i.test(title)) {
    return "project_program_management";
  }
  if (WMS_ERP_SUPPLY_CHAIN_SIGNALS.test(corpus)) {
    return "wms_erp_supply_chain";
  }
  if (RETAIL_TECH_SIGNALS.test(corpus)) {
    return "retail_analytics";
  }
  if (PROJECT_PROGRAM_SIGNALS.test(corpus)) {
    return "project_program_management";
  }
  if (isBusinessAnalysisRole(title, jdText)) {
    return "business_analysis";
  }
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

function isBusinessAnalysisRole(title: string, jdText: string): boolean {
  const corpus = `${title}\n${jdText}`;
  if (BUSINESS_ANALYSIS_TITLE_SIGNALS.test(corpus)) {
    return true;
  }
  return BUSINESS_ANALYSIS_DETAIL_SIGNALS.filter((pattern) => pattern.test(corpus)).length >= 4;
}

function businessAnalysisContent(jdText = ""): Pick<TailoredResumeContent, "subtitle" | "summaryBullets" | "coreStrengths"> {
  if (PRODUCT_ECOMMERCE_BA_SIGNALS.test(jdText)) {
    return {
      subtitle: "Product Ownership Support | eCommerce Workflows | Agile Backlogs | UAT Readiness",
      summaryBullets: [
        "Senior Business Analyst experienced in Product Owner support, requirements discovery, stakeholder alignment, and Agile delivery for digital, retail, and enterprise systems.",
        "Translates eCommerce, SaaS-style, and operational product needs into current-state and future-state analysis, user stories, acceptance criteria, process flows, and delivery-ready backlog items.",
        "Supports product and delivery teams through backlog refinement, prioritization conversations, Agile ceremonies, UAT planning, defect triage, and release readiness evidence.",
        "Brings practical retail technology, omnichannel fulfillment, POS/WMS, API workflow, Jira, Confluence, SQL, and vendor coordination experience without overstating unsupported platform-specific claims.",
        "Known for clarifying ambiguity, aligning business and technical stakeholders, and helping teams move from discovery to implementation with clean documentation and testable outcomes."
      ],
      coreStrengths: [
        "Product Owner support and backlog refinement",
        "eCommerce and retail technology workflow analysis",
        "SaaS-style requirements discovery and user story writing",
        "Acceptance criteria, process flows, and delivery-ready documentation",
        "Stakeholder workshops, prioritization, and cross-functional alignment",
        "Agile ceremonies, UAT planning, defect triage, and release readiness",
        "Jira, Confluence, SQL, API workflow, POS, WMS, and fulfillment context",
        "Vendor coordination, implementation support, and go-live evidence",
        "Clear communication across product, engineering, QA, and business teams"
      ]
    };
  }

  if (MAXIMO_EWMS_SIGNALS.test(jdText)) {
    return {
      subtitle: "I&IT Business Analysis | EWMS / IBM Maximo | QA/UAT Governance | Enterprise Systems",
      summaryBullets: [
        "Senior IT Business Analyst experienced in I&IT delivery, requirements gathering, stakeholder engagement, QA/UAT, and implementation support for complex enterprise systems.",
        "Brings confirmed Maximo-related experience across The Brick through Talize, supporting asset, work order, preventative maintenance, service request, facilities, warehouse, reporting, and operational workflows.",
        "Translates current-state and future-state analysis into process maps, BRD inputs, functional requirements, user stories, acceptance criteria, test scenarios, and stakeholder signoff evidence.",
        "Supports EWMS-style delivery through defect triage, reporting checks, integration validation, data handoffs, release readiness, and business-to-technical coordination.",
        "Works across Jira, Confluence, SQL, Postman, WMS/POS/back-office contexts, AODA-aware documentation, Agile delivery, and regulated service environments."
      ],
      coreStrengths: [
        "I&IT business analysis and requirements gathering",
        "EWMS and IBM Maximo-related workflow analysis",
        "Asset, work order, preventative maintenance, and service-request processes",
        "Current-state and future-state process mapping",
        "BRD inputs, user stories, use cases, and acceptance criteria",
        "UAT planning, test cases, defect triage, and release readiness",
        "Jira, Confluence, SQL, Postman, WMS, POS, and reporting validation",
        "Stakeholder workshops, approvals, signoffs, and implementation support",
        "AODA-aware documentation and information management"
      ]
    };
  }

  return {
    subtitle: "I&IT Business Analysis | Agile Delivery | Public Sector Systems | UAT Governance",
    summaryBullets: [
      "Senior business analyst experienced in I&IT and public sector delivery, requirements gathering, stakeholder engagement, and clear documentation for complex public sector systems.",
      "Translates current-state and future-state analysis into business process mapping, use cases, user stories, acceptance criteria, and delivery-ready backlog items.",
      "Supports Product Owners and delivery teams through backlog refinement, Agile ceremonies, UAT planning, defect triage, and release readiness evidence.",
      "Works across DevOps, Jira, Confluence, Oracle, and SQL, with workflow analysis and approval process improvement, information management, and AODA-aware documentation.",
      "Known for clarifying ambiguity, aligning business and technical stakeholders, and improving implementation quality across regulated service environments."
    ],
    coreStrengths: [
      "I&IT business analysis and requirements gathering",
      "Stakeholder engagement and workshop facilitation",
      "Current-state and future-state process mapping",
      "Use cases, user stories, and acceptance criteria",
      "Backlog refinement and Product Owner support",
      "Agile ceremonies, UAT planning, and defect triage",
      "DevOps, Jira, Confluence, Oracle, and SQL",
      "Public sector delivery, AODA-aware documentation, and information management",
      "Workflow analysis and approval process improvement"
    ]
  };
}

function normalizeEmployer(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/\b(corporation|corp|incorporated|inc|limited|ltd|llc|canada)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canPlaceExperienceBulletUnderEmployer(record: TailoredExperienceBullet, employerContext: string): boolean {
  const provenance = record.provenance;
  if (!provenance.verified) return false;
  if (!provenance.employer) return false;
  const sourceEmployer = normalizeEmployer(provenance.employer);
  const targetEmployer = normalizeEmployer(employerContext);
  if (!sourceEmployer || !targetEmployer) return false;
  return sourceEmployer === targetEmployer || sourceEmployer.includes(targetEmployer) || targetEmployer.includes(sourceEmployer);
}

function toExperienceRecord(item: ExperienceItem, score: number): TailoredExperienceBullet {
  const confidence = typeof item.confidence === "number" ? item.confidence : 60;
  return {
    text: sanitizeVisibleResumeText(item.text),
    tags: item.tags || [],
    score,
    provenance: {
      source: clean(item.source || "profile_truth_bank"),
      employer: clean(item.employer || ""),
      confidence,
      verified: Boolean(item.verified)
    }
  };
}

function pickExperienceBullets(track: string, jdText: string, experiencePool: ExperienceItem[]): TailoredExperienceBullet[] {
  const jdTokens = new Set(tokenize(jdText));
  const scored = experiencePool
    .map((item) => {
      const tags = item.tags || [];
      const textTokens = tokenize(item.text);
      let score = 0;
      if (track === "retail_analytics" && tags.includes("retail")) score += 3;
      if (track === "azure_cloud" && (tags.includes("cloud") || tags.includes("architecture"))) score += 3;
      if (track === "salesforce_crm_delivery" && (tags.includes("salesforce") || tags.includes("crm"))) score += 4;
      if (track === "business_analysis" && (tags.includes("ba") || tags.includes("requirements") || tags.includes("uat"))) score += 4;
      if (track === "project_program_management" && (tags.includes("delivery") || tags.includes("governance") || tags.includes("project"))) score += 4;
      if (track === "wms_erp_supply_chain" && (tags.includes("wms") || tags.includes("erp") || tags.includes("supply_chain") || tags.includes("warehouse") || tags.includes("retail"))) score += 4;
      if (tags.includes("delivery")) score += 1;
      for (const token of textTokens) {
        if (jdTokens.has(token)) score += 1;
      }
      if (item.verified) score += 1;
      return toExperienceRecord(item, score);
    })
    .sort((a, b) => b.score - a.score);

  const selected: TailoredExperienceBullet[] = [];
  const seen = new Set<string>();
  for (const item of scored.filter((entry) => entry.score >= 3)) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(item);
    if (selected.length >= 20) break;
  }
  return selected;
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
  const businessAnalysis = track === "business_analysis";
  const baContent = businessAnalysis ? businessAnalysisContent(jdText) : null;

  const subtitle = clean(
    baContent?.subtitle
      || trackConfig.subtitle
      || "Enterprise Systems | Delivery Governance | Integration Execution | Operational Impact"
  );

  const summaryTemplates = trackConfig.summary_templates || [];
  const summaryBullets = (baContent?.summaryBullets || (summaryTemplates.length > 0
    ? summaryTemplates.map((template) => fillTemplate(String(template), roleTitle, company))
    : [
        `${roleTitle} leader focused on structured delivery, measurable outcomes, and clear stakeholder communication.`,
        `Experienced with ${company} priorities across enterprise systems, integrations, and release governance.`,
        "Known for reducing ambiguity, improving handoffs, and driving reliable implementation quality.",
        "Combines business translation with technical delivery discipline across complex environments.",
        "Portfolio includes practical implementation work across GitHub and Una Labs assets."
      ]))
    .map(sanitizeVisibleResumeText)
    .slice(0, 5);

  const coreStrengths = [...new Set((baContent?.coreStrengths || trackConfig.core_strengths || []).map((item) => sanitizeVisibleResumeText(item)).filter(Boolean))].slice(0, baContent ? 9 : 7);
  const experienceBulletRecords = pickExperienceBullets(track, jdText, truthBank.experience_pool || []);
  const experienceBullets = experienceBulletRecords.map((item) => item.text);
  const additionalAchievementBullets = experienceBulletRecords
    .filter((item) => !item.provenance.employer || !item.provenance.verified)
    .map((item) => item.text)
    .slice(0, 6);
  const portfolioBullets = [...new Set((truthBank.portfolio || []).map((item) => sanitizeVisibleResumeText(item)).filter(Boolean))].slice(0, 2);
  const provenanceStats: ResumeProvenanceStats = {
    selectedBulletCount: experienceBulletRecords.length,
    employerAttributedBulletCount: experienceBulletRecords.filter((item) => item.provenance.employer && item.provenance.verified).length,
    unattributedBulletCount: experienceBulletRecords.filter((item) => !item.provenance.employer || !item.provenance.verified).length,
    rejectedEmployerPlacementCount: 0,
    fallbackBulletCount: additionalAchievementBullets.length,
    placedEmployerBulletCount: 0
  };

  const joined = [
    sanitizeVisibleResumeText(roleTitle),
    subtitle,
    ...summaryBullets,
    ...coreStrengths,
    ...experienceBullets,
    ...additionalAchievementBullets,
    ...portfolioBullets
  ].join("\n");

  needsReviewReasons.push(...checkContamination(joined, jdText, scoringRules));
  const forbiddenPhrase = FORBIDDEN_VISIBLE_RESUME_PATTERNS.find((pattern) => pattern.test(joined));
  if (forbiddenPhrase) {
    needsReviewReasons.push(`forbidden visible resume phrase detected: ${forbiddenPhrase.source}`);
  }

  return {
    targetTitle: roleTitle,
    subtitle,
    summaryBullets,
    coreStrengths,
    experienceBullets,
    experienceBulletRecords,
    additionalAchievementBullets,
    portfolioBullets,
    track,
    needsReview: needsReviewReasons.length > 0,
    needsReviewReasons,
    provenanceStats
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
    `Target Title: ${sanitizeVisibleResumeText(content.targetTitle)}`,
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
    ...(content.additionalAchievementBullets.length > 0
      ? ["", "Selected Achievements", ...content.additionalAchievementBullets.map((bullet) => `- ${bullet}`)]
      : []),
    "",
    "Portfolio",
    ...content.portfolioBullets.map((bullet) => `- ${bullet}`)
  ].join("\n");
}
