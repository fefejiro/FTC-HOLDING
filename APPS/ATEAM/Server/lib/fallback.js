export function statusFromError(err) {
  const text = String(err?.message || err || "");
  const direct = Number(err?.status || err?.statusCode);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const match = text.match(/\b(408|409|423|425|429|500|502|503|504)\b/);
  if (match) return Number(match[1]);
  if (/timeout|timed out|aborted/i.test(text)) return 408;
  if (/rate limit|quota/i.test(text)) return 429;
  return 0;
}

export function shouldRetryWithFallback(err) {
  const status = statusFromError(err);
  if ([408, 409, 423, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const text = String(err?.message || err || "").toLowerCase();
  if (
    text.includes("model not found") ||
    text.includes("does not exist") ||
    text.includes("temporarily unavailable") ||
    text.includes("overloaded")
  ) {
    return true;
  }
  return false;
}

export function buildModelMeta({ modelUsed = "", fallbackUsed = false } = {}) {
  return {
    modelUsed: String(modelUsed || ""),
    fallbackUsed: Boolean(fallbackUsed)
  };
}
