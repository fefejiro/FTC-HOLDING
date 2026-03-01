/**
 * Utility functions for handling rate limits without React hooks
 * Can be used in non-React contexts like API request functions
 */

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Parse rate limit headers from a fetch response
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    resetTime: parseInt(reset, 10) * 1000, // Convert to milliseconds
  };
}

/**
 * Check if we should show a warning (only once per reset window)
 */
function shouldShowWarning(info: RateLimitInfo): boolean {
  const percentRemaining = (info.remaining / info.limit) * 100;
  
  // Warn at 20% remaining
  if (percentRemaining > 20 || percentRemaining === 0) {
    return false;
  }
  
  const warningKey = `rate-limit-warning-${info.resetTime}`;
  const hasShownWarning = sessionStorage.getItem(warningKey);
  
  if (hasShownWarning) {
    return false;
  }
  
  sessionStorage.setItem(warningKey, 'true');
  return true;
}

/**
 * Create a rate limit warning event that UI can listen to
 */
export function checkAndNotifyRateLimit(response: Response) {
  const rateLimitInfo = parseRateLimitHeaders(response.headers);
  
  if (!rateLimitInfo) {
    return;
  }
  
  if (shouldShowWarning(rateLimitInfo)) {
    const resetIn = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000 / 60);
    
    // Dispatch custom event that UI can listen to
    window.dispatchEvent(new CustomEvent('rate-limit-warning', {
      detail: {
        remaining: rateLimitInfo.remaining,
        limit: rateLimitInfo.limit,
        resetIn,
      }
    }));
  }
}

/**
 * Format retry time for user display
 */
export function formatRetryTime(retryAfter: number): string {
  const minutes = Math.floor(retryAfter / 60);
  const seconds = retryAfter % 60;
  
  if (minutes > 0) {
    if (seconds > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Extract rate limit error info from API response
 */
export async function extractRateLimitError(response: Response): Promise<{
  message: string;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
} | null> {
  if (response.status !== 429) {
    return null;
  }
  
  try {
    const data = await response.json();
    return {
      message: data.error || 'Too many requests, please try again later',
      retryAfter: data.retryAfter,
      limit: data.limit,
      remaining: data.remaining,
    };
  } catch {
    return {
      message: 'Too many requests, please try again later',
    };
  }
}
