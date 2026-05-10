import type { FailureReason, RecognitionSource } from '../state/ritual-state';
import type { InputRoute, OutputRoute } from '../audio/useAudioRoute';

export type RecognitionTimeline = {
  listenTappedAtMs: number;
  permissionPromptStartedAtMs?: number;
  permissionGrantedAtMs?: number;
  recordingStartedAtMs?: number;
  recordingCompletedAtMs?: number;
  uploadStartedAtMs?: number;
  recognitionRequestStartedAtMs?: number;
  recognitionResponseReceivedAtMs?: number;
  lyricsRequestStartedAtMs?: number;
  lyricsResponseReceivedAtMs?: number;
  contextRequestStartedAtMs?: number;
  contextResponseReceivedAtMs?: number;
  resultScreenRenderedAtMs?: number;
  totalTimeToFirstResultMs?: number;
  totalTimeToFullContextMs?: number;
};

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
  timeline?: RecognitionTimeline;
  retryCount?: number;
  backendStatusCode?: number;
  lyricsAvailable?: boolean;
  contextAvailable?: boolean;
  failedStep?: 'permission' | 'recording' | 'upload' | 'recognition' | 'lyrics' | 'context' | 'unknown';
  timeoutReasons?: string[];
};

/**
 * Log a recognition attempt with comprehensive diagnostics
 */
export function logRecognitionAttempt(attempt: RecognitionAttemptLog) {
  const summary = {
    source: attempt.recognitionSource,
    confidence: attempt.confidence,
    failed: attempt.failureReason !== null,
    duration: attempt.recognitionEndedAtMs - attempt.recognitionStartedAtMs,
    ...(attempt.timeline && {
      captureMs: attempt.timeline.recordingCompletedAtMs
        ? attempt.timeline.recordingCompletedAtMs - (attempt.timeline.recordingStartedAtMs || 0)
        : undefined,
      uploadMs: attempt.timeline.recognitionRequestStartedAtMs
        ? attempt.timeline.recognitionRequestStartedAtMs - (attempt.timeline.uploadStartedAtMs || 0)
        : undefined,
      matchingMs: attempt.timeline.recognitionResponseReceivedAtMs
        ? attempt.timeline.recognitionResponseReceivedAtMs - (attempt.timeline.recognitionRequestStartedAtMs || 0)
        : undefined,
      lyricsMs: attempt.timeline.lyricsResponseReceivedAtMs
        ? attempt.timeline.lyricsResponseReceivedAtMs - (attempt.timeline.lyricsRequestStartedAtMs || 0)
        : undefined,
      contextMs: attempt.timeline.contextResponseReceivedAtMs
        ? attempt.timeline.contextResponseReceivedAtMs - (attempt.timeline.contextRequestStartedAtMs || 0)
        : undefined,
      totalToFirstResult: attempt.timeline.totalTimeToFirstResultMs,
      totalToFullContext: attempt.timeline.totalTimeToFullContextMs,
    }),
    failedStep: attempt.failedStep,
    retryCount: attempt.retryCount,
    statusCode: attempt.backendStatusCode,
    lyricsAvailable: attempt.lyricsAvailable,
    contextAvailable: attempt.contextAvailable,
  };
  console.log('[recognition-attempt]', JSON.stringify(summary));
}

/**
 * Record a timeline milestone with timestamp
 */
export function recordMilestone(
  timeline: RecognitionTimeline,
  key: keyof RecognitionTimeline,
): void {
  (timeline as Record<string, number | undefined>)[key] = Date.now();
}

/**
 * Calculate phase durations from timeline
 */
export function getPhasesDuration(timeline: RecognitionTimeline) {
  return {
    permissionRequestDurationMs:
      timeline.permissionGrantedAtMs && timeline.permissionPromptStartedAtMs
        ? timeline.permissionGrantedAtMs - timeline.permissionPromptStartedAtMs
        : undefined,
    captureDurationMs:
      timeline.recordingCompletedAtMs && timeline.recordingStartedAtMs
        ? timeline.recordingCompletedAtMs - timeline.recordingStartedAtMs
        : undefined,
    uploadDurationMs:
      timeline.recognitionRequestStartedAtMs && timeline.uploadStartedAtMs
        ? timeline.recognitionRequestStartedAtMs - timeline.uploadStartedAtMs
        : undefined,
    recognitionDurationMs:
      timeline.recognitionResponseReceivedAtMs && timeline.recognitionRequestStartedAtMs
        ? timeline.recognitionResponseReceivedAtMs - timeline.recognitionRequestStartedAtMs
        : undefined,
    lyricsFetchDurationMs:
      timeline.lyricsResponseReceivedAtMs && timeline.lyricsRequestStartedAtMs
        ? timeline.lyricsResponseReceivedAtMs - timeline.lyricsRequestStartedAtMs
        : undefined,
    contextFetchDurationMs:
      timeline.contextResponseReceivedAtMs && timeline.contextRequestStartedAtMs
        ? timeline.contextResponseReceivedAtMs - timeline.contextRequestStartedAtMs
        : undefined,
  };
}

/**
 * Log a diagnostic event with structured data to dev console only
 */
export function logRecognitionDiagnostic(
  attemptId: string | number,
  event: string,
  startTimeMs?: number,
  data?: Record<string, unknown>,
): void {
  if (__DEV__) {
    const duration = startTimeMs ? ` +${Date.now() - startTimeMs}ms` : '';
    console.log(
      `[Recognition:${attemptId}]${duration} ${event}`,
      data ? JSON.stringify(data, null, 2) : '',
    );
  }
}

/**
 * Get human-readable attempt summary for debugging
 */
export function getAttemptSummary(attempt: RecognitionAttemptLog): string {
  const totalDuration = attempt.recognitionEndedAtMs - attempt.recognitionStartedAtMs;
  const sections = [attempt.lyricsAvailable ? 'L' : '-', attempt.contextAvailable ? 'C' : '-'].join(
    '',
  );

  const status = attempt.failureReason ? '✗ Failed' : '✓ Matched';
  return `${status} [${sections}] ${totalDuration}ms (conf: ${attempt.confidence ?? 'N/A'})`;
}
