import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Hook to provide user feedback about rate limiting
 * Warns users when they're approaching limits and shows helpful messages when limited
 */
export function useRateLimitFeedback() {
  const { toast } = useToast();

  /**
   * Parse rate limit headers from a fetch response
   */
  const parseRateLimitHeaders = (headers: Headers): RateLimitInfo | null => {
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
  };

  /**
   * Show rate limit warning when approaching limit
   */
  const showWarningIfNeeded = (info: RateLimitInfo) => {
    const percentRemaining = (info.remaining / info.limit) * 100;
    
    // Warn at 20% remaining (but only once per session per endpoint)
    if (percentRemaining <= 20 && percentRemaining > 0) {
      const warningKey = `rate-limit-warning-${info.resetTime}`;
      const hasShownWarning = sessionStorage.getItem(warningKey);
      
      if (!hasShownWarning) {
        sessionStorage.setItem(warningKey, 'true');
        
        const resetIn = Math.ceil((info.resetTime - Date.now()) / 1000 / 60);
        toast({
          title: "⚠️ Approaching Rate Limit",
          description: `You have ${info.remaining} of ${info.limit} requests remaining. Limit resets in ${resetIn} minute${resetIn !== 1 ? 's' : ''}.`,
          variant: "default",
          duration: 5000,
        });
      }
    }
  };

  /**
   * Show rate limit exceeded message with countdown
   */
  const showRateLimitError = (error: any) => {
    if (error.retryAfter) {
      const minutes = Math.floor(error.retryAfter / 60);
      const seconds = error.retryAfter % 60;
      
      let timeMessage = '';
      if (minutes > 0) {
        timeMessage = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        if (seconds > 0) {
          timeMessage += ` and ${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
      } else {
        timeMessage = `${seconds} second${seconds !== 1 ? 's' : ''}`;
      }

      toast({
        title: "🛑 Rate Limit Reached",
        description: error.error || `Please wait ${timeMessage} before trying again.`,
        variant: "destructive",
        duration: 8000,
      });
    } else {
      // Generic rate limit error without retry info
      toast({
        title: "🛑 Too Many Requests",
        description: error.error || "Please slow down and try again in a moment.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  /**
   * Check response for rate limit info and provide feedback
   */
  const checkRateLimit = (response: Response) => {
    // Check for rate limit exceeded (429 status)
    if (response.status === 429) {
      response.json().then(showRateLimitError).catch(() => {
        // Fallback if JSON parsing fails
        toast({
          title: "🛑 Too Many Requests",
          description: "Please slow down and try again in a moment.",
          variant: "destructive",
          duration: 5000,
        });
      });
      return;
    }

    // Check headers for rate limit info
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    if (rateLimitInfo) {
      showWarningIfNeeded(rateLimitInfo);
    }
  };

  return {
    checkRateLimit,
    parseRateLimitHeaders,
    showRateLimitError,
  };
}

/**
 * Helper to format rate limit error messages
 */
export function formatRateLimitMessage(retryAfter: number): string {
  const minutes = Math.floor(retryAfter / 60);
  const seconds = retryAfter % 60;
  
  if (minutes > 0) {
    if (seconds > 0) {
      return `Please wait ${minutes}m ${seconds}s before trying again`;
    }
    return `Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before trying again`;
  }
  return `Please wait ${seconds} second${seconds !== 1 ? 's' : ''} before trying again`;
}
