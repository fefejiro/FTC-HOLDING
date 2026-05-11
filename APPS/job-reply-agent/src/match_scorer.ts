import type { ParsedOpportunity, ProfileConfig, ResumeMapConfig } from "./types.js";

export function scoreOpportunity(
  parsed: ParsedOpportunity,
  profile: ProfileConfig,
  resumeMap: ResumeMapConfig,
  rawBody: string
): { score: number; rationale: string } {
  const text = `${parsed.roleTitle}\n${parsed.summary}\n${rawBody}`.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  for (const title of profile.target_titles) {
    if (text.includes(title.toLowerCase())) {
      score += 30;
      reasons.push(`Target title match: ${title}`);
      break;
    }
  }

  const strengthsMatched = profile.core_strengths.filter((strength) =>
    text.includes(strength.toLowerCase())
  );
  score += Math.min(40, strengthsMatched.length * 8);
  if (strengthsMatched.length > 0) {
    reasons.push(`Strength matches: ${strengthsMatched.slice(0, 4).join(", ")}`);
  }

  const mapMatches = resumeMap.mappings.filter((map) =>
    map.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  );
  if (mapMatches.length > 0) {
    score += 20;
    reasons.push(`Role family match: ${mapMatches[0].role_family}`);
  }

  if (parsed.location.toLowerCase().includes("remote") || parsed.location.toLowerCase().includes("toronto")) {
    score += 10;
    reasons.push("Preferred location pattern matched");
  }

  return { score: Math.min(100, score), rationale: reasons.join(" | ") || "No strong matches" };
}
