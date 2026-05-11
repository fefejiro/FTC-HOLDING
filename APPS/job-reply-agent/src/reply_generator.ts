import type { ParsedOpportunity, ProfileConfig } from "./types.js";

const TN_LINE =
  "I am a Canadian citizen and can be considered for qualifying TN roles under USMCA, where applicable.";

const FORBIDDEN_PATTERNS: RegExp[] = [
  /&nbsp;/gi,
  /&ndash;/gi,
  /&mdash;/gi,
  /&ldquo;|&rdquo;/gi,
  /&lsquo;|&rsquo;/gi,
  /&amp;/gi,
  /\bdisclaimer\b/gi,
  /\bunsubscribe\b/gi,
  /\b(eeo|equal opportunity employer)\b/gi
];

function scrubForbidden(text: string): string {
  let out = text;
  for (const re of FORBIDDEN_PATTERNS) out = out.replace(re, " ");
  // No em-dashes as decoration.
  out = out.replace(/\s*[—–]\s*/g, " ");
  return out.replace(/[ \t]+/g, " ").replace(/ \n/g, "\n").trim();
}

function pickStrengths(parsed: ParsedOpportunity, profile: ProfileConfig): string[] {
  const haystack = `${parsed.roleTitle} ${parsed.cleanBody || parsed.summary || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ");
  const haystackTokens = new Set(haystack.split(/\s+/).filter((t) => t.length >= 3));

  const scored = (profile.core_strengths || []).map((strength) => {
    const tokens = strength
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    let score = 0;
    for (const t of tokens) if (haystackTokens.has(t)) score += 1;
    return { strength, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const matched = scored.filter((s) => s.score > 0).map((s) => s.strength);
  const padded = matched.length >= 3 ? matched : [
    ...matched,
    ...(profile.core_strengths || []).filter((s) => !matched.includes(s))
  ];
  return padded.slice(0, 5);
}

function joinOxford(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function buildBody(params: {
  firstName: string;
  roleTitle: string;
  strengths: string[];
  includeTn: boolean;
  signerFirstName: string;
  profile: ProfileConfig;
}): string {
  const { firstName, roleTitle, strengths, includeTn, signerFirstName, profile } = params;
  const paragraphs: string[] = [
    `Hi ${firstName},`,
    `Thank you for reaching out. I am interested in the ${roleTitle} opportunity.`,
    `My background includes ${joinOxford(strengths)}, which appears aligned with the needs of this role.`,
    `I have attached my resume for your review. Please share the full job description, client details, interview process, compensation range, and next steps when available.`
  ];
  if (includeTn) paragraphs.push(TN_LINE);

  const signature = [
    "Best regards,",
    signerFirstName,
    profile.contact.phone,
    profile.contact.email,
    profile.contact.linkedin,
    profile.contact.github
  ]
    .filter(Boolean)
    .join("\n");

  return `${paragraphs.join("\n\n")}\n\n${signature}`;
}

export function generateReply(params: {
  parsed: ParsedOpportunity;
  profile: ProfileConfig;
  /** Deprecated. TN line is now derived from parsed.isUsRole. */
  includeTnLine?: boolean;
}): { subject: string; body: string } {
  const { parsed, profile } = params;
  const subject = `Re: ${parsed.roleTitle}`;

  const recruiterFirst =
    (parsed.recruiterName || "").trim().split(/\s+/)[0] || "";
  const firstName =
    recruiterFirst && !/^recruiter$/i.test(recruiterFirst) ? recruiterFirst : "there";

  const signerFirstName = (profile.name || "").trim().split(/\s+/)[0] || profile.name || "";

  let strengths = pickStrengths(parsed, profile);

  let body = buildBody({
    firstName,
    roleTitle: parsed.roleTitle,
    strengths,
    includeTn: parsed.isUsRole === true,
    signerFirstName,
    profile
  });

  // Word-count guardrail measures only the message paragraphs, not signature.
  const measure = (s: string) => {
    const sigIdx = s.lastIndexOf("\n\nBest regards,");
    const msg = sigIdx >= 0 ? s.slice(0, sigIdx) : s;
    return countWords(msg);
  };

  let words = measure(body);
  if (words > 150 && strengths.length > 3) {
    strengths = strengths.slice(0, 3);
    body = buildBody({
      firstName,
      roleTitle: parsed.roleTitle,
      strengths,
      includeTn: parsed.isUsRole === true,
      signerFirstName,
      profile
    });
    words = measure(body);
  }
  if (words < 90) {
    // Pad with an extra clarifying ask without sounding desperate.
    body = body.replace(
      /(\nI have attached my resume[^\n]+)\n/,
      "$1 If helpful, I can also share a short call window this week to align on scope, timeline, team structure, and any technical due diligence questions on your side.\n"
    );
  }

  return { subject, body: scrubForbidden(body) };
}

