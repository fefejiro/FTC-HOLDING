export function evaluateRisk(body: string, blockKeywords: string[], reviewKeywords: string[]): {
  blocked: boolean;
  needsReview: boolean;
  reasons: string[];
} {
  const haystack = body.toLowerCase();
  const reasons: string[] = [];

  for (const keyword of blockKeywords) {
    if (containsKeyword(haystack, keyword)) {
      reasons.push(`Blocked keyword detected: ${keyword}`);
    }
  }

  const reviewHits: string[] = [];
  for (const keyword of reviewKeywords) {
    if (containsKeyword(haystack, keyword)) {
      reviewHits.push(keyword);
    }
  }

  if (reviewHits.length > 0) {
    reasons.push(`Needs review keyword(s): ${reviewHits.join(", ")}`);
  }

  return {
    blocked: reasons.some((x) => x.startsWith("Blocked")),
    needsReview: reviewHits.length > 0,
    reasons
  };
}

function containsKeyword(haystack: string, keyword: string): boolean {
  const normalized = keyword.toLowerCase().trim();
  if (!normalized) return false;

  if (normalized.includes(" ")) {
    return haystack.includes(normalized);
  }

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(haystack);
}
