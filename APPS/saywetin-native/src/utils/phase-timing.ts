/**
 * Phase-aware timing and threshold management
 * Coordinates graceful degradation on slow networks
 */

export type PhaseTimeThreshold = {
  warningThresholdMs: number;
  slowThresholdMs: number;
  criticalThresholdMs: number;
  fallbackThresholdMs?: number;
};

/**
 * Timing thresholds for each recognition phase
 * Used to determine when to show slow-network warnings and trigger fallbacks
 */
export const PHASE_TIME_THRESHOLDS: Record<string, PhaseTimeThreshold> = {
  'uploading': {
    warningThresholdMs: 3000,    // Show warning after 3s
    slowThresholdMs: 4500,        // Mark as slow after 4.5s
    criticalThresholdMs: 9000,    // Critical after 9s
    fallbackThresholdMs: 12000,   // Fall back after 12s
  },
  'matching': {
    warningThresholdMs: 4000,    // Show warning after 4s
    slowThresholdMs: 7000,        // Mark as slow after 7s
    criticalThresholdMs: 12000,   // Critical after 12s
    fallbackThresholdMs: 15000,   // Fall back to lyric after 15s
  },
  'context-loading': {
    warningThresholdMs: 2000,    // Show warning after 2s (per-section)
    slowThresholdMs: 4000,        // Mark as slow after 4s
    criticalThresholdMs: 8000,    // Critical after 8s
    fallbackThresholdMs: 10000,   // Omit section after 10s
  },
};

/**
 * Categorize phase duration into quality tier
 */
export type PerformanceTier = 'fast' | 'normal' | 'slow' | 'critical';

export function getPerformanceTier(phase: string, elapsedMs: number): PerformanceTier {
  const thresholds = PHASE_TIME_THRESHOLDS[phase];
  if (!thresholds) return 'normal';

  if (elapsedMs >= thresholds.criticalThresholdMs) return 'critical';
  if (elapsedMs >= thresholds.slowThresholdMs) return 'slow';
  if (elapsedMs > 1000) return 'normal';
  return 'fast';
}

/**
 * Check if elapsed time has crossed a warning threshold
 */
export function hasPassedWarningThreshold(phase: string, elapsedMs: number): boolean {
  const thresholds = PHASE_TIME_THRESHOLDS[phase];
  return thresholds ? elapsedMs >= thresholds.warningThresholdMs : false;
}

/**
 * Check if we should trigger fallback (e.g., switch to lyric recognition)
 */
export function shouldTriggerFallback(phase: string, elapsedMs: number): boolean {
  const thresholds = PHASE_TIME_THRESHOLDS[phase];
  if (!thresholds?.fallbackThresholdMs) return false;
  return elapsedMs >= thresholds.fallbackThresholdMs;
}

/**
 * Get retry delay in ms based on attempt number and phase
 * Exponential backoff with jitter
 */
export function getRetryDelayMs(attemptNumber: number, phase?: string): number {
  const baseDelay = attemptNumber === 1 ? 500 : 1000 * Math.pow(1.5, attemptNumber - 1);
  const jitter = Math.random() * 200;
  const maxDelay = 10000;
  return Math.min(baseDelay + jitter, maxDelay);
}

/**
 * Estimate remaining time until fallback
 * Used for UI messaging ("X seconds left before fallback")
 */
export function getEstimatedTimeUntilFallback(phase: string, elapsedMs: number): number {
  const thresholds = PHASE_TIME_THRESHOLDS[phase];
  if (!thresholds?.fallbackThresholdMs) return -1;
  const remaining = thresholds.fallbackThresholdMs - elapsedMs;
  return remaining > 0 ? remaining : 0;
}

/**
 * Map elapsed time to animated progress 0-1
 * Non-linear to feel more natural (ease-in-out-like)
 */
export function getTimeProgress(phase: string, elapsedMs: number): number {
  const thresholds = PHASE_TIME_THRESHOLDS[phase];
  if (!thresholds?.fallbackThresholdMs) return 0;

  const progress = Math.min(elapsedMs / thresholds.fallbackThresholdMs, 1);
  // Ease-in-out-like curve
  return progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
}

/**
 * Get human-readable duration string with smart precision
 * "2.3s", "2m 45s", etc.
 */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Check if two elapsed times span different message thresholds
 * Used to determine if UI update is needed
 */
export function didCrossThreshold(phase: string, previousMs: number, currentMs: number): boolean {
  const thresholds = PHASE_TIME_THRESHOLDS[phase];
  if (!thresholds) return false;

  const thresholdValues = [
    thresholds.warningThresholdMs,
    thresholds.slowThresholdMs,
    thresholds.criticalThresholdMs,
    thresholds.fallbackThresholdMs,
  ].filter((t) => t !== undefined);

  return thresholdValues.some((threshold) => {
    return previousMs < threshold && currentMs >= threshold;
  });
}
