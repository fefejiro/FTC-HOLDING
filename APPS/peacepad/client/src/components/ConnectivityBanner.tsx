import { useState, useEffect, useRef } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConnectionStatus } from "@/hooks/useReconnectingWebSocket";

interface ConnectivityBannerProps {
  status: ConnectionStatus;
}

export function ConnectivityBanner({ status }: ConnectivityBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const statusRef = useRef(status);

  // Keep ref in sync with latest status
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Add delay before showing banner (give reconnection a chance)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (status === 'connected') {
      // Immediately hide banner when connected
      setShowBanner(false);
      setIsDismissed(false);
    } else if (status === 'reconnecting') {
      // Wait 5 seconds before showing "reconnecting" banner
      // (most reconnects happen within 1-3 seconds, even on mobile)
      timeoutId = setTimeout(() => {
        // Only show banner if STILL reconnecting (not if status changed during timeout)
        if (statusRef.current === 'reconnecting') {
          setShowBanner(true);
        }
      }, 5000);
    } else if (status === 'disconnected') {
      // Wait 4 seconds before showing "disconnected" banner
      // (gives time for connection to establish when switching apps)
      timeoutId = setTimeout(() => {
        // Only show banner if STILL disconnected
        if (statusRef.current === 'disconnected') {
          setShowBanner(true);
        }
      }, 4000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status]);

  // Don't show banner if connected, dismissed, or delay hasn't passed
  if (status === 'connected' || isDismissed || !showBanner) {
    return null;
  }

  const isReconnecting = status === 'reconnecting';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 shadow-md safe-area-top"
      data-testid="connectivity-banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isReconnecting ? (
            <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          ) : (
            <WifiOff className="h-4 w-4 shrink-0" />
          )}
          <p className="text-sm font-medium truncate">
            {isReconnecting
              ? "Reconnecting... Messages will be sent when connection is restored"
              : "You're offline. Some features may not work."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 hover:bg-destructive-foreground/10"
          onClick={() => setIsDismissed(true)}
          data-testid="button-dismiss-connectivity-banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
