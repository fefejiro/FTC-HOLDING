export type PrepFeeling = "calm" | "anxious" | "frustrated" | "overwhelmed" | "sad" | "angry";
export type PrepEntryMode = "received" | "sending";

/**
 * Reuses the legacy Prep Chat journey as a small, local-first drafting step.
 * It intentionally does not persist a session or call the legacy API. The
 * resulting text is handed to the existing V2 message composer for review.
 */
export function buildCalmDraft(topic: string, feeling?: PrepFeeling, entryMode?: PrepEntryMode): string {
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
