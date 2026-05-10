/**
 * Enhanced Recognition Diagnostic Logger
 * Tracks full lifecycle of recognition attempts with comprehensive timing and state
 */

export type RecognitionTimeline = {
  listenTappedAtMs: number;
  permissionPromptStartedAtMs?: number;
  permissionGrantedAtMs?: number;
  recordingStartedAtMs?: number;
  recordingCompletedAtMs?: number;
  uploadStartedAtMs?: number;
  recognitionRequestSentAtMs?: number;
  recognitionResponseReceivedAtMs?: number;
  lyricsRequestStartedAtMs?: number;
  lyricsResponseReceivedAtMs?: number;
  meaningRequestStartedAtMs?: number;
  meaningResponseReceivedAtMs?: number;
  resultScreenRenderedAtMs?: number;
};

export type RecognitionAttemptLog = {
  // Unique identifiers
  attemptId: string;
  sessionId: string;

  // Timeline milestones
  timeline: RecognitionTimeline;

  // Result information
  matchConfidence?: number;
  matched?: boolean;
  matchTitle?: string;
  matchArtist?: string;

  // Section availability
  lyricsAvailable: boolean;
  meaningAvailable: boolean;
  culturalContextAvailable: boolean;

  // Failure information
  failedStep?: 'permission' | 'capture' | 'upload' | 'recognition' | 'lyrics' | 'meaning';
  failureReason?: string;
  errorCode?: string;
  backendStatusCode?: number;

  // Retry information
  permissionRetries: number;
  captureRetries: number;
  uploadRetries: number;
  recognitionRetries: number;

  // Network state
  wasOffline?: boolean;
  connectionQuality?: 'good' | 'fair' | 'poor';
  clientErrorCount: number;
  serverErrorCount: number;
  timeoutCount: number;

  // Performance indicators
  totalTimeToFirstMatchMs?: number;
  totalTimeToFullContextMs?: number;
  captureAudioDurationMs?: number;
  uploadSizeBytes?: number;

  // User actions
  userCancelledCapture?: boolean;
  userRetried?: boolean;
  userSwitchedToFallback?: boolean;

  // Diagnostic tags
  tags: string[];
};

/**
 * Create a new recognition attempt log
 */
export function createRecognitionLog(attemptId: string, sessionId: string): RecognitionAttemptLog {
  return {
    attemptId,
    sessionId,
    timeline: {
      listenTappedAtMs: Date.now(),
    },
    lyricsAvailable: false,
    meaningAvailable: false,
    culturalContextAvailable: false,
    permissionRetries: 0,
    captureRetries: 0,
    uploadRetries: 0,
    recognitionRetries: 0,
    clientErrorCount: 0,
    serverErrorCount: 0,
    timeoutCount: 0,
    tags: [],
  };
}

/**
 * Record a timeline milestone
 */
export function recordMilestone(log: RecognitionAttemptLog, key: keyof RecognitionTimeline): void {
  (log.timeline as Record<string, number>)[key] = Date.now();
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
      timeline.recognitionRequestSentAtMs && timeline.uploadStartedAtMs
        ? timeline.recognitionRequestSentAtMs - timeline.uploadStartedAtMs
        : undefined,
    recognitionDurationMs:
      timeline.recognitionResponseReceivedAtMs && timeline.recognitionRequestSentAtMs
        ? timeline.recognitionResponseReceivedAtMs - timeline.recognitionRequestSentAtMs
        : undefined,
    lyricsFetchDurationMs:
      timeline.lyricsResponseReceivedAtMs && timeline.lyricsRequestStartedAtMs
        ? timeline.lyricsResponseReceivedAtMs - timeline.lyricsRequestStartedAtMs
        : undefined,
    meaningFetchDurationMs:
      timeline.meaningResponseReceivedAtMs && timeline.meaningRequestStartedAtMs
        ? timeline.meaningResponseReceivedAtMs - timeline.meaningRequestStartedAtMs
        : undefined,
  };
}

/**
 * Log a diagnostic event with structured data
 */
export function logRecognitionDiagnostic(
  log: RecognitionAttemptLog,
  event: string,
  data?: Record<string, unknown>,
): void {
  if (__DEV__) {
    const duration = Date.now() - log.timeline.listenTappedAtMs;
    console.log(
      `[Recognition:${log.attemptId}] +${duration}ms ${event}`,
      data ? JSON.stringify(data, null, 2) : '',
    );
  }
}

/**
 * Add a diagnostic tag for later filtering
 */
export function addTag(log: RecognitionAttemptLog, tag: string): void {
  if (!log.tags.includes(tag)) {
    log.tags.push(tag);
  }
}

/**
 * Finalize and serialize log for submission to analytics
 */
export function finalizeRecognitionLog(log: RecognitionAttemptLog): RecognitionAttemptLog {
  // Calculate total durations
  if (log.timeline.resultScreenRenderedAtMs && log.timeline.recognitionResponseReceivedAtMs) {
    log.totalTimeToFirstMatchMs = log.timeline.recognitionResponseReceivedAtMs - log.timeline.listenTappedAtMs;
  }

  if (log.timeline.resultScreenRenderedAtMs) {
    log.totalTimeToFullContextMs = log.timeline.resultScreenRenderedAtMs - log.timeline.listenTappedAtMs;
  }

  // Auto-add summary tags
  if (log.matched) {
    addTag(log, 'match_success');
  } else {
    addTag(log, 'match_failed');
  }

  if (log.wasOffline) {
    addTag(log, 'offline_attempt');
  }

  if (log.connectionQuality === 'poor') {
    addTag(log, 'poor_connection');
  }

  if (log.permissionRetries > 0) {
    addTag(log, `permission_retries_${log.permissionRetries}`);
  }

  if (log.uploadRetries > 0) {
    addTag(log, `upload_retries_${log.uploadRetries}`);
  }

  return log;
}

/**
 * Human-readable summary of attempt for debugging
 */
export function getAttemptSummary(log: RecognitionAttemptLog): string {
  const totalDuration = log.totalTimeToFullContextMs || Date.now() - log.timeline.listenTappedAtMs;
  const status = log.matched ? '✓ Matched' : '✗ Failed';
  const sections = [
    log.lyricsAvailable ? 'L' : '-',
    log.meaningAvailable ? 'M' : '-',
    log.culturalContextAvailable ? 'C' : '-',
  ].join('');

  return `${status} [${sections}] ${totalDuration}ms (conf: ${log.matchConfidence || 'N/A'})`;
}
