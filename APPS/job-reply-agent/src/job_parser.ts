import type { ParsedOpportunity, RecruiterMessage } from "./types.js";

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&#(\d+);/g, (_m, n) => {
      try {
        return String.fromCharCode(parseInt(n, 10));
      } catch {
        return " ";
      }
    })
    .replace(/&[a-z]+;/gi, " ");
}

function stripHtml(s: string): string {
  return decodeEntities(String(s || "").replace(/<[^>]*>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/**
 * Strip recruiter signature, legal disclaimers, unsubscribe blocks, and any
 * pasted job-description tail. Returns just the recruiter's actual message.
 */
export function isolateRecruiterMessage(rawBody: string): string {
  const clean = stripHtml(rawBody);

  const cutMarkers: RegExp[] = [
    /\n\s*(disclaimer|confidentiality notice|this (e-?mail|message) (is|may))/i,
    /\n\s*(unsubscribe|to opt[- ]?out|you are receiving this)/i,
    /\n\s*(equal opportunity|eeo|we are an equal)/i,
    /\n\s*-{3,}\s*\n/,
    /\n\s*_{3,}\s*\n/,
    /\n\s*(job description|jd)\s*[:\-]/i,
    /\n\s*(requirements|responsibilities|qualifications|must have|nice to have)\s*[:\-]/i
  ];

  let cutoff = clean.length;
  for (const marker of cutMarkers) {
    const m = clean.match(marker);
    if (m && typeof m.index === "number" && m.index < cutoff) {
      cutoff = m.index;
    }
  }
  return clean.slice(0, cutoff).trim();
}

function extractFirstNameFromHeader(fromHeader: string): string {
  const cleaned = String(fromHeader || "")
    .replace(/<[^>]+>/g, "")
    .replace(/"/g, "")
    .trim();
  if (!cleaned) return "";
  const first = cleaned.split(/[\s,]+/)[0] || "";
  if (
    /^(no-?reply|noreply|info|jobs?|hr|recruiting|recruitment|team|talent|careers?|hello|admin|notifications?|do[-_]?not[-_]?reply)$/i.test(
      first
    )
  ) {
    return "";
  }
  return /^[A-Z][a-zA-Z'.-]{1,}$/.test(first) ? first : "";
}

function extractFirstNameFromBody(body: string): string {
  const m = body.match(
    /(?:^|\n)\s*(?:best regards|kind regards|warm regards|regards|thanks(?:\s*&\s*regards)?|thank you|sincerely|cheers|best)\s*,?\s*\n+\s*([A-Z][a-zA-Z'.-]+)/i
  );
  if (m && m[1]) return m[1];
  return "";
}

function isUsRole(text: string): boolean {
  const t = text.toLowerCase();
  if (/\b(usmca|tn visa|tn status|us citizen|u\.s\. citizen)\b/.test(t)) return true;
  if (/\b(united states|usa|u\.s\.a\.|u\.s\.)\b/.test(t)) return true;
  if (
    /\b(remote|hybrid|onsite|on-site|based)\b[^\n]{0,40}\b(NY|CA|TX|FL|IL|MA|WA|CO|GA|NC|VA|PA|OH|NJ|MI|AZ|MN|OR|UT|NV|CT|MD|TN|SC|KY|AL|LA|OK|IN|MO|WI|IA|KS|AR|MS|NE|ID|HI|AK|ME|NH|VT|RI|DE|WV|ND|SD|MT|WY|NM)\b/.test(
      text
    )
  ) {
    return true;
  }
  if (
    /\b(NY|CA|TX|FL|IL|MA|WA|CO|GA|NC|VA|PA|OH|NJ|MI|AZ|MN|OR|UT|NV|CT|MD|TN|SC|KY|AL|LA|OK|IN|MO|WI|IA|KS|AR|MS|NE|ID|HI|AK|ME|NH|VT|RI|DE|WV|ND|SD|MT|WY|NM),?\s*(?:USA|US)\b/.test(
      text
    )
  ) {
    return true;
  }
  return false;
}

function extractFirstMatch(input: string, regexes: RegExp[]): string {
  for (const regex of regexes) {
    const match = input.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function extractEmailAddress(fromHeader: string): string {
  const value = String(fromHeader || "");
  const angleMatch = value.match(/<([^<>@\s]+@[^<>\s]+)>/);
  if (angleMatch?.[1]) return angleMatch[1].trim().toLowerCase();
  const directMatch = value.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  return directMatch?.[0]?.trim().toLowerCase() || "";
}

function guessRole(subject: string, body: string): string {
  const knownRoles = [
    "Technical Program Manager",
    "Business Systems Analyst",
    "ERP Systems Analyst",
    "Business Analyst",
    "Project Manager",
    "WMS Consultant",
    "Integration Analyst"
  ];
  const joined = `${subject}\n${body}`.toLowerCase();
  for (const role of knownRoles) {
    if (joined.includes(role.toLowerCase())) {
      return role;
    }
  }
  return subject.replace(/re:\s*/i, "").trim() || "Unknown Role";
}

/**
 * Extract a clean role title from the raw subject/body by removing:
 * - Prefixes like "New Position", "Job Opening", "Opportunity", "Requisition"
 * - Patterns like RQ123, Req #456, #789 (requisition IDs)
 * - Separators like ||, |, — (when used to separate requisition from role)
 */
function cleanRoleTitle(subject: string, body: string): string {
  const rawTitle = guessRole(subject, body);

  // Remove "New Position ||" or similar prefix patterns
  let cleaned = rawTitle
    .replace(/^new\s+position\s*[||:\-\s]+/i, "")
    .replace(/^job\s+opening\s*[||:\-\s]+/i, "")
    .replace(/^opportunity\s*[||:\-\s]+/i, "")
    .replace(/^requisition\s*[||:\-\s]+/i, "")
    .trim();

  // Remove requisition ID patterns (RQ12345, Req #123, #123)
  cleaned = cleaned
    .replace(/\bRQ\d+\s*[-|:]*\s*/gi, "")
    .replace(/\bReq\s+#?\d+\s*[-|:]*\s*/gi, "")
    .replace(/^\s*#\d+\s*[-|:]*\s*/i, "")
    .trim();

  // Remove trailing separators (||, -, etc.) and trim
  cleaned = cleaned.replace(/\s*[||\-–—]\s*$/, "").trim();

  // Normalize multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Fallback
  return cleaned || rawTitle;
}

/**
 * Extract alignment keywords from job description (JD) using an allowlist.
 * Returns top 3-5 unique keywords that appear in the JD.
 */
function extractAlignmentKeywords(jdText: string): string[] {
  const allowlist = [
    "Automation",
    "API",
    "Python",
    "SQL",
    "SDLC",
    "ERP",
    "WMS",
    "POS",
    "UAT",
    "Deployment",
    "Cloud",
    "Integration",
    "Enterprise Systems",
    "AI Workflow Automation",
    "JavaScript",
    "TypeScript",
    "React",
    "Node",
    "Express",
    "Database",
    "Agile",
    "Scrum",
    "REST",
    "JSON",
    "XML",
    "Testing",
    "Jenkins",
    "Docker",
    "Kubernetes",
    "AWS",
    "Azure",
    "Google Cloud",
    "DevOps",
    "CI/CD",
    "Git",
    "Linux",
    "Windows",
    "RabbitMQ",
    "Kafka",
    "Redis",
    "MongoDB",
    "PostgreSQL",
    "MySQL",
    "Oracle",
    "SAP",
    "Salesforce",
    "ServiceNow",
    "Azure DevOps",
    "Jira",
    "Confluence",
    "GraphQL",
    "Microservices",
    "Kubernetes",
    "Terraform",
    "Ansible",
    "Webpack",
    "Vite",
    "NPM",
    "Yarn",
    "Maven",
    "Gradle",
    "SonarQube",
    "Security",
    "Authentication",
    "OAuth",
    "JWT",
    "SSL/TLS",
    "Performance Optimization",
    "Troubleshooting",
    "Problem Solving",
    "Communication",
    "Leadership",
    "Project Management",
    "Business Analysis",
    "Requirements",
    "Documentation",
    "Training"
  ];

  const lowerJD = jdText.toLowerCase();
  const found = new Map<string, number>(); // keyword -> count

  for (const keyword of allowlist) {
    const lowerKeyword = keyword.toLowerCase();
    // Count occurrences (simple word-match; could be more sophisticated)
    const regex = new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = lowerJD.match(regex);
    if (matches) {
      found.set(keyword, matches.length);
    }
  }

  // Sort by frequency (descending) and return top 5
  const sorted = Array.from(found.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword)
    .slice(0, 5);

  return sorted.length > 0 ? sorted : [];
}

function guessEmploymentType(text: string): string {
  const haystack = text.toLowerCase();
  if (haystack.includes("contract")) return "Contract";
  if (haystack.includes("full-time") || haystack.includes("full time")) return "Full-time";
  return "Unspecified";
}

export function parseRecruiterEmail(message: RecruiterMessage): ParsedOpportunity {
  const decodedSubject = stripHtml(message.subject);
  const decodedBody = stripHtml(message.body);
  const cleanBody = isolateRecruiterMessage(message.body);
  const combined = `${decodedSubject}\n${decodedBody}`;

  const roleTitle = guessRole(decodedSubject, decodedBody);
  const cleanedRoleTitle = cleanRoleTitle(decodedSubject, decodedBody);
  const alignmentKeywords = extractAlignmentKeywords(combined);

  const senderEmail = extractEmailAddress(message.from || "");
  const company = extractFirstMatch(combined, [
    /company\s*:\s*([^\n]+)/i,
    /client\s*:\s*([^\n]+)/i,
    /from\s+([A-Za-z0-9 .,&-]+)\s+recruit/i
  ]) || senderEmail || "Unknown Company";

  const rawLocation =
    extractFirstMatch(combined, [
      /location\s*:\s*([^\n]+)/i,
      /based in\s*([^\n.]+)/i,
      /\b(remote|hybrid|onsite|on-site)\b\s*[-,:]?\s*([A-Za-z .,/]{0,40})?/i
    ]) || "Unspecified";
  // Trim location at first sentence/colon boundary and cap length so we don't
  // capture the rest of a job description.
  const location = (() => {
    const first = rawLocation.split(/[.:;\n]|  +/)[0] || rawLocation;
    const trimmed = first.replace(/\s+/g, " ").trim();
    if (!trimmed) return "Unspecified";
    return trimmed.length > 60 ? trimmed.slice(0, 57) + "..." : trimmed;
  })();

  const rawSalary = extractFirstMatch(combined, [
    /(\$\s?[0-9]{2,3}[kK]\s?-\s?\$\s?[0-9]{2,3}[kK])/,
    /(\$\s?[0-9]{2,3}\s?\/\s?hr)/i,
    /rate\s*:\s*(\$?\s?[0-9][^\n]{0,30})/i
  ]);
  // Require at least one digit so we don't capture words like "Regards,".
  const salaryOrRate =
    rawSalary && /\d/.test(rawSalary) ? rawSalary.trim() : "Unspecified";

  const fromName = extractFirstNameFromHeader(message.from || "");
  const bodyName = extractFirstNameFromBody(cleanBody || decodedBody);
  const recruiterName = fromName || bodyName || "";

  const summary = cleanBody.split("\n").slice(0, 4).join(" ").trim().slice(0, 240);

  let parserConfidence = 55;
  if (company !== "Unknown Company") parserConfidence += 10;
  if (location !== "Unspecified") parserConfidence += 10;
  if (salaryOrRate !== "Unspecified") parserConfidence += 10;
  if (roleTitle !== "Unknown Role") parserConfidence += 10;
  parserConfidence = Math.min(100, parserConfidence);

  return {
    roleTitle,
    cleanRoleTitle: cleanedRoleTitle,
    alignmentKeywords,
    company,
    location,
    employmentType: guessEmploymentType(combined),
    salaryOrRate,
    summary,
    recruiterName,
    parserConfidence,
    cleanBody,
    isUsRole: isUsRole(combined)
  };
}
