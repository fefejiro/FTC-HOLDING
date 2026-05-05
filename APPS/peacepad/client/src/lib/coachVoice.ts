export function normalizeCoachVoiceTranscript(transcript: string): string {
  return (transcript || "").replace(/\s+/g, " ").trim();
}

export function shouldAutoSendCoachVoiceTurn(content: string, isPending: boolean): boolean {
  return !isPending && normalizeCoachVoiceTranscript(content).length > 0;
}
