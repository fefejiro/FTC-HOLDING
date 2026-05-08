/**
 * Phase 2c: Timing Field Utilities
 * Provides helpers for computing and displaying recognition timing metrics
 */

/**
 * Computes a human-friendly description of recognition duration
 * Shows how long it took from listen start to match received
 */
export function getRecognitionDurationLabel(
  listenStartedAtMs?: number,
  recognitionReceivedAtMs?: number,
): string | null {
  if (!listenStartedAtMs || !recognitionReceivedAtMs) {
    return null;
  }

  const durationMs = recognitionReceivedAtMs - listenStartedAtMs;

  if (durationMs < 1000) {
    return `Recognized in under 1 second`;
  }

  if (durationMs < 2000) {
    return `Recognized in about 1 second`;
  }

  if (durationMs < 3000) {
    return `Recognized in about 2 seconds`;
  }

  if (durationMs < 5000) {
    return `Recognized in ${Math.round(durationMs / 1000)} seconds`;
  }

  return `Recognition took ${Math.round(durationMs / 1000)} seconds`;
}

/**
 * Classifies recognition speed for UI feedback
 */
export function getRecognitionSpeedClass(
  listenStartedAtMs?: number,
  recognitionReceivedAtMs?: number,
): 'fast' | 'normal' | 'slow' | null {
  if (!listenStartedAtMs || !recognitionReceivedAtMs) {
    return null;
  }

  const durationMs = recognitionReceivedAtMs - listenStartedAtMs;

  if (durationMs < 1500) {
    return 'fast';
  }

  if (durationMs < 4000) {
    return 'normal';
  }

  return 'slow';
}

/**
 * Computes a hint about recognition performance
 * Shows if recognition was unusually fast/slow
 */
export function getRecognitionPerformanceHint(
  listenStartedAtMs?: number,
  recognitionReceivedAtMs?: number,
): string | null {
  const speedClass = getRecognitionSpeedClass(listenStartedAtMs, recognitionReceivedAtMs);

  switch (speedClass) {
    case 'fast':
      return 'Recognition was super fast!';
    case 'slow':
      return 'Recognition was slower than usual.';
    default:
      return null;
  }
}

/**
 * Computes total elapsed time from listen to result display
 */
export function getTotalRecognitionTimeMs(
  listenStartedAtMs?: number,
  resultShownAtMs?: number,
): number | null {
  if (!listenStartedAtMs || !resultShownAtMs) {
    return null;
  }

  return resultShownAtMs - listenStartedAtMs;
}

/**
 * Breaks down the recognition process into phases
 */
export function getRecognitionPhaseBreakdown(
  listenStartedAtMs?: number,
  listenEndedAtMs?: number,
  recognitionReceivedAtMs?: number,
  resultShownAtMs?: number,
): {
  capturePhaseMs: number | null;
  matchingPhaseMs: number | null;
  displayPhaseMs: number | null;
  totalMs: number | null;
} {
  return {
    capturePhaseMs:
      listenStartedAtMs && listenEndedAtMs ? listenEndedAtMs - listenStartedAtMs : null,
    matchingPhaseMs:
      listenEndedAtMs && recognitionReceivedAtMs
        ? recognitionReceivedAtMs - listenEndedAtMs
        : null,
    displayPhaseMs:
      recognitionReceivedAtMs && resultShownAtMs
        ? resultShownAtMs - recognitionReceivedAtMs
        : null,
    totalMs:
      listenStartedAtMs && resultShownAtMs ? resultShownAtMs - listenStartedAtMs : null,
  };
}

/**
 * Formats milliseconds as a human-readable duration
 * Examples: "1s", "2.5s", "45ms"
 */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 10) {
    return `${seconds.toFixed(1)}s`;
  }

  return `${Math.round(seconds)}s`;
}

/**
 * Determines if a timing indicates network/backend slowness
 */
export function isSlowRecognition(
  listenStartedAtMs?: number,
  recognitionReceivedAtMs?: number,
): boolean {
  if (!listenStartedAtMs || !recognitionReceivedAtMs) {
    return false;
  }

  const durationMs = recognitionReceivedAtMs - listenStartedAtMs;
  return durationMs > 4000; // > 4 seconds considered slow
}

/**
 * Determines if a timing indicates very fast recognition (unusual/notable)
 */
export function isFastRecognition(
  listenStartedAtMs?: number,
  recognitionReceivedAtMs?: number,
): boolean {
  if (!listenStartedAtMs || !recognitionReceivedAtMs) {
    return false;
  }

  const durationMs = recognitionReceivedAtMs - listenStartedAtMs;
  return durationMs < 1500; // < 1.5 seconds considered fast
}
