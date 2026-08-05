import type { MessagePreviewResponse } from "../api/contracts";

export function ruleBasedMessagePreview(content: string): MessagePreviewResponse {
  const originalMessage = content.trim();
  if (!originalMessage) throw new Error("Enter a message to check.");
  const needsPause = /\b(always|never|your fault|lying|liar|useless)\b|!{2,}/i.test(originalMessage);
  return {
    tone: needsPause ? "pause suggested" : "clear",
    summary: needsPause
      ? "Consider focusing on the practical request."
      : "This message is direct and focused on practical details.",
    rewordingSuggestion: needsPause ? "Please confirm the practical details when you can." : null,
    originalMessage
  };
}
