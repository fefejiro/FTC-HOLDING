import type { ParsedOpportunity, ResumeMapConfig, ResumeSelection } from "./types.js";

export function selectResume(parsed: ParsedOpportunity, body: string, map: ResumeMapConfig): ResumeSelection {
  const haystack = `${parsed.roleTitle}\n${parsed.summary}\n${body}`.toLowerCase();

  let best: { roleFamily: string; resume: string; hits: number } | null = null;

  for (const item of map.mappings) {
    const hits = item.keywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).length;
    if (!best || hits > best.hits) {
      best = {
        roleFamily: item.role_family,
        resume: item.resume,
        hits
      };
    }
  }

  if (!best || best.hits === 0) {
    return {
      resumePath: map.default_resume,
      roleFamily: "default",
      why: "No strong role family hit; selected default approved resume"
    };
  }

  return {
    resumePath: best.resume,
    roleFamily: best.roleFamily,
    why: `Matched ${best.hits} role-family keyword(s)`
  };
}
