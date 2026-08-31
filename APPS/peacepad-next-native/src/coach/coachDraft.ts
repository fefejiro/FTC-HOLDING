export type CoachFeeling = "calm" | "anxious" | "frustrated" | "overwhelmed" | "sad" | "angry";
export type CoachEntryMode = "received" | "sending";

/**
 * Creates a local, review-only fallback when the configured PeaceBot provider
 * is unavailable. It does not persist, transmit, diagnose, or send anything.
 */
export function buildCalmDraft(topic: string, feeling?: CoachFeeling, entryMode?: CoachEntryMode): string {
  const normalized = topic.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const feelingLine = feeling && feeling !== "calm"
    ? `I am feeling ${feeling}, so I would like us to keep this conversation calm.`
    : "I would like us to keep this conversation calm and practical.";
  const opening = entryMode === "received"
    ? `I received a message about ${normalized}.`
    : `I would like to talk about ${normalized}.`;
  return `${opening} ${feelingLine} Could we agree on a clear next step?`;
}
