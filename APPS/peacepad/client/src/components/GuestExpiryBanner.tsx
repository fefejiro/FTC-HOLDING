import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Clock, X, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface GuestSessionInfo {
  expiresAt: string;
  daysRemaining: number;
}

export function GuestExpiryBanner() {
  const { user, login } = useAuth();
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

  const { daysRemaining } = sessionInfo;
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
            ? "Trial expires today"
            : daysRemaining === 1
            ? "Trial expires tomorrow"
            : `Trial: ${daysRemaining}d left`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant={isUrgent ? "destructive" : "outline"}
          onClick={login}
          className="h-6 px-2 text-xs gap-1"
          data-testid="button-upgrade-account"
        >
          <UserPlus className="h-3 w-3" />
          Sign Up
        </Button>
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
