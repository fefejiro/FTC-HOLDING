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

  const withTitleVariants = (title: string): string[] => {
    const base = title.toLowerCase().trim();
    const variants = new Set<string>([base]);

    // Common singular/plural variants in recruiter emails.
    variants.add(base.replace(/\bsystems\b/g, "system"));
    variants.add(base.replace(/\bsystem\b/g, "systems"));
    variants.add(base.replace(/\banalysts\b/g, "analyst"));
    variants.add(base.replace(/\banalyst\b/g, "analysts"));

    return Array.from(variants);
  };

  for (const title of profile.target_titles) {
    const titleMatches = withTitleVariants(title);
    if (titleMatches.some((candidate) => text.includes(candidate))) {
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

  const geoScore = scoreGeographyPreference(parsed.location, text);
  if (geoScore > 0) {
    score += geoScore;
    reasons.push("Preferred geography/work-mode matched");
  }

  return { score: Math.min(100, score), rationale: reasons.join(" | ") || "No strong matches" };
}

function scoreGeographyPreference(location: string, text: string): number {
  const blob = `${location || ""} ${text || ""}`.toLowerCase();
  let bonus = 0;

  if (/\bremote\b|work from home|wfh/.test(blob)) bonus += 12;
  else if (/\bhybrid\b/.test(blob)) bonus += 10;
  else if (/\bonsite\b|\bon-site\b|\bon site\b/.test(blob)) bonus += 6;

  if (/\b(canada|toronto|ontario|vancouver|montreal|calgary|ottawa|edmonton|winnipeg|halifax)\b/.test(blob)) {
    bonus += 12;
  }
  if (/\b(united states|usa|u\.s\.a\.|u\.s\.)\b/.test(blob)) {
    bonus += 12;
  }

  return Math.min(24, bonus);
}
