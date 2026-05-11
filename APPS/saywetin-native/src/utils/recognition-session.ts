/**
 * Recognition Session Management
 *
 * Coordinates cleanup of in-flight requests, timers, and resources
 * when resetting a recognition session or navigating back.
 */

/**
 * Session cleanup handlers for orchestrating session reset.
 *
 * Caller creates these refs and passes to reset logic;
 * reset logic aborts and clears them in one coordinated call.
 */
export type SessionCleanupHandlers = {
  /** AbortController for HTTP requests (upload, polling, etc) */
  cancelToken: AbortController;
  /** Timer IDs to clear (setTimeout) */
  timers: Set<ReturnType<typeof setTimeout>>;
  /** Interval IDs to clear (setInterval) */
  intervals: Set<ReturnType<typeof setInterval>>;
};

/**
 * Create a new session cleanup handler object.
 */
export function createSessionCleanupHandlers(): SessionCleanupHandlers {
  return {
    cancelToken: new AbortController(),
    timers: new Set(),
    intervals: new Set(),
  };
}

/**
 * Reset a recognition session by aborting all in-flight work and clearing timers.
 *
 * @param handlers - Session cleanup handlers (timers, abort controller, etc)
 */
export function resetRecognitionSessionFully(handlers: SessionCleanupHandlers): void {
  // Abort all in-flight HTTP requests
  if (handlers.cancelToken) {
    handlers.cancelToken.abort();
  }

  // Clear all active timers (setTimeout)
  if (handlers.timers && handlers.timers.size > 0) {
    handlers.timers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    handlers.timers.clear();
  }

  // Clear all active intervals (setInterval)
  if (handlers.intervals && handlers.intervals.size > 0) {
    handlers.intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    handlers.intervals.clear();
  }
}

/**
 * Register a timer for cleanup on session reset.
 *
 * @param handlers - Session cleanup handlers
 * @param callback - Function to run after delay
 * @param delayMs - Delay in milliseconds
 * @returns Timer ID (same as setTimeout, for reference)
 */
export function scheduleRecognitionTimer(
  handlers: SessionCleanupHandlers,
  callback: () => void,
  delayMs: number,
): ReturnType<typeof setTimeout> {
  const timerId = setTimeout(() => {
    callback();
    handlers.timers.delete(timerId);
  }, delayMs);

  handlers.timers.add(timerId);
  return timerId;
}

/**
 * Register an interval for cleanup on session reset.
 *
 * @param handlers - Session cleanup handlers
 * @param callback - Function to run on each interval
 * @param intervalMs - Interval in milliseconds
 * @returns Interval ID (same as setInterval, for reference)
 */
export function scheduleRecognitionInterval(
  handlers: SessionCleanupHandlers,
  callback: () => void,
  intervalMs: number,
): ReturnType<typeof setInterval> {
  const intervalId = setInterval(callback, intervalMs);
  handlers.intervals.add(intervalId);
  return intervalId;
}

/**
 * Cancel a registered timer (removes from cleanup set).
 *
 * @param handlers - Session cleanup handlers
 * @param timerId - Timer ID to cancel
 */
export function cancelRecognitionTimer(
  handlers: SessionCleanupHandlers,
  timerId: ReturnType<typeof setTimeout>,
): void {
  clearTimeout(timerId);
  handlers.timers.delete(timerId);
}

/**
 * Cancel a registered interval (removes from cleanup set).
 *
 * @param handlers - Session cleanup handlers
 * @param intervalId - Interval ID to cancel
 */
export function cancelRecognitionInterval(
  handlers: SessionCleanupHandlers,
  intervalId: ReturnType<typeof setInterval>,
): void {
  clearInterval(intervalId);
  handlers.intervals.delete(intervalId);
}

/**
 * Get abort signal for HTTP requests.
 *
 * Caller passes this to fetch/axios/etc to enable graceful cancellation.
 *
 * @param handlers - Session cleanup handlers
 * @returns AbortSignal for use with fetch API
 */
export function getRecognitionAbortSignal(handlers: SessionCleanupHandlers): AbortSignal {
  return handlers.cancelToken.signal;
}
