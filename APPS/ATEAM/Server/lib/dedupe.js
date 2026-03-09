import crypto from "crypto";

function normalizeMessage(msg) {
  return {
    role: String(msg?.role || "user").trim().toLowerCase(),
    agent: String(msg?.agent || "").trim(),
    content: String(msg?.content || "").trim()
  };
}

export function messageFingerprint(msg) {
  const normalized = normalizeMessage(msg);
  const raw = `${normalized.role}|${normalized.agent}|${normalized.content}`;
  return crypto.createHash("sha1").update(raw).digest("hex");
}

export function isDuplicateMessage(thread, msg, lookback = 8) {
  if (!Array.isArray(thread) || !thread.length) return false;
  const target = messageFingerprint(msg);
  const start = Math.max(0, thread.length - Math.max(1, lookback));

  for (let i = thread.length - 1; i >= start; i -= 1) {
    const item = thread[i];
    if (!item || typeof item !== "object") continue;
    const fp = String(item.fingerprint || messageFingerprint(item));
    if (fp === target) return true;
  }

  return false;
}
