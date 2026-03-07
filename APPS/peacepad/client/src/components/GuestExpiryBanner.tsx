import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface GuestSessionInfo {
  expiresAt: string;
  daysRemaining: number;
}

function resolveDaysRemaining(sessionInfo: GuestSessionInfo): number {
  const expiresAtMs = new Date(sessionInfo.expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) {
    return Math.max(0, sessionInfo.daysRemaining);
  }
  const msRemaining = expiresAtMs - Date.now();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}

export function GuestExpiryBanner() {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem("guestBannerDismissed") === "true";
  });

  const { data: sessionInfo, isLoading } = useQuery<GuestSessionInfo | null>({
    queryKey: ["/api/auth/guest-session-info"],
    enabled: !!user?.isGuest,
    staleTime: 60 * 60 * 1000,
  });

  if (!user?.isGuest || isDismissed) {
    return null;
  }

  if (isLoading) {
    return (
      <div 
        className="h-[34px] bg-muted/30 border-b border-border/30"
        style={{ contain: 'strict' }}
        aria-hidden="true"
      />
    );
  }

  if (!sessionInfo) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem("guestBannerDismissed", "true");
    setIsDismissed(true);
  };

  const daysRemaining = resolveDaysRemaining(sessionInfo);
  const isUrgent = daysRemaining <= 3;

  return (
    <div
      className={`relative flex items-center justify-between gap-2 px-3 py-1.5 text-xs h-[34px] ${
        isUrgent
          ? "bg-destructive/10 border-b border-destructive/20"
          : "bg-muted/50 border-b border-border/50"
      }`}
      style={{ contain: 'layout style' }}
      role="alert"
      aria-live="polite"
      data-testid="banner-guest-expiry"
    >
      <div className="flex items-center gap-1.5">
        <Clock className={`h-3 w-3 flex-shrink-0 ${isUrgent ? "text-destructive" : "text-muted-foreground"}`} />
        <span className={isUrgent ? "text-destructive font-medium" : "text-muted-foreground"}>
          {daysRemaining === 0
            ? "Your private beta access window ends today. Contact support if you need extended access."
            : daysRemaining === 1
            ? "Your private beta access window ends tomorrow. Contact support if you need extended access."
            : isUrgent
            ? `Your private beta access window ends in ${daysRemaining} days. Contact support if you need extended access.`
            : `Private beta access window: ${daysRemaining} days left`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="h-6 px-2 text-[10px] uppercase tracking-wide">
          Private beta
        </Badge>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
          className="h-6 w-6"
          aria-label="Dismiss banner"
          data-testid="button-dismiss-banner"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
