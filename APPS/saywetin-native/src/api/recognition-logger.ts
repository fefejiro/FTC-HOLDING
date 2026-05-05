import type { FailureReason, RecognitionSource } from '../state/ritual-state';
import type { InputRoute, OutputRoute } from '../audio/useAudioRoute';

export type RecognitionAttemptLog = {
  recognitionSource: RecognitionSource;
  outputRoute: OutputRoute;
  inputRoute: InputRoute;
  listenStartedAtMs: number;
  listenEndedAtMs: number;
  recognitionStartedAtMs: number;
  recognitionEndedAtMs: number;
  failureReason: FailureReason | null;
  confidence: number | null;
  matchedSongId: string | null;
  matchedOffsetMs: number | null;
};

export function logRecognitionAttempt(attempt: RecognitionAttemptLog) {
  console.log('[recognition-attempt]', JSON.stringify(attempt));
}
