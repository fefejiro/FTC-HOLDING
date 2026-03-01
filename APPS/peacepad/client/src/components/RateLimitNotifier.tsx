import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Component that listens for rate limit warnings from API calls
 * and displays user-friendly toast notifications
 */
export function RateLimitNotifier() {
  const { toast } = useToast();

  useEffect(() => {
    const handleRateLimitWarning = (event: Event) => {
      const customEvent = event as CustomEvent<{
        remaining: number;
        limit: number;
        resetIn: number;
      }>;

      const { remaining, limit, resetIn } = customEvent.detail;

      toast({
        title: "⚠️ Approaching Rate Limit",
        description: `You have ${remaining} of ${limit} requests remaining. Limit resets in ${resetIn} minute${resetIn !== 1 ? 's' : ''}.`,
        variant: "default",
        duration: 5000,
      });
    };

    window.addEventListener('rate-limit-warning', handleRateLimitWarning);

    return () => {
      window.removeEventListener('rate-limit-warning', handleRateLimitWarning);
    };
  }, [toast]);

  // This component doesn't render anything
  return null;
}
