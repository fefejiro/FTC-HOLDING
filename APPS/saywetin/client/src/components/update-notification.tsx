import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Clock3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyWebUpdateNow,
  checkForWebUpdate,
  deferWebUpdate,
  type WebUpdateStatus,
} from "@/lib/web-update-manager";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState<WebUpdateStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dismissedForCurrentOpenRef = useRef(false);
  const isApplyingUpdateRef = useRef(false);

  const remainingHours = useMemo(() => {
    if (!updateStatus?.forceAfterMs) {
      return null;
    }

    const msRemaining = updateStatus.forceAfterMs - Date.now();
    if (msRemaining <= 0) {
      return 0;
    }

    return Math.ceil(msRemaining / (60 * 60 * 1000));
  }, [updateStatus?.forceAfterMs]);

  const applyUpdate = useCallback(async (status: WebUpdateStatus) => {
    if (isApplyingUpdateRef.current) {
      return;
    }

    isApplyingUpdateRef.current = true;
    setIsRefreshing(true);

    try {
      await applyWebUpdateNow();
    } catch (error) {
      console.warn("[UpdateNotification] Failed to apply update:", error);
      setIsRefreshing(false);
    } finally {
      isApplyingUpdateRef.current = false;
    }
  }, []);

  const evaluateUpdate = useCallback(async () => {
    const status = await checkForWebUpdate();

    if (!status.updateAvailable) {
      setUpdateStatus(null);
      setIsRefreshing(false);
      return;
    }

    if (status.forceUpdateRequired) {
      setUpdateStatus(status);
      await applyUpdate(status);
      return;
    }

    if (dismissedForCurrentOpenRef.current) {
      return;
    }

    setUpdateStatus(status);
  }, [applyUpdate]);

  useEffect(() => {
    evaluateUpdate();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        dismissedForCurrentOpenRef.current = false;
        void evaluateUpdate();
      } else {
        dismissedForCurrentOpenRef.current = false;
      }
    };

    const handleFocus = () => {
      dismissedForCurrentOpenRef.current = false;
      void evaluateUpdate();
    };

    const handleResume = () => {
      dismissedForCurrentOpenRef.current = false;
      void evaluateUpdate();
    };

    const handleBackground = () => {
      dismissedForCurrentOpenRef.current = false;
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void evaluateUpdate();
      }
    }, CHECK_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("saywetin:app-resume", handleResume);
    window.addEventListener("saywetin:app-background", handleBackground);
    window.addEventListener("saywetin:web-update-detected", handleFocus as EventListener);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("saywetin:app-resume", handleResume);
      window.removeEventListener("saywetin:app-background", handleBackground);
      window.removeEventListener("saywetin:web-update-detected", handleFocus as EventListener);
    };
  }, [evaluateUpdate]);

  const handleRefresh = async () => {
    if (!updateStatus) {
      return;
    }

    await applyUpdate(updateStatus);
  };

  const handleLater = () => {
    deferWebUpdate();
    dismissedForCurrentOpenRef.current = true;
    setUpdateStatus(null);
  };

  if (!updateStatus?.updateAvailable) {
    return null;
  }

  const forceText =
    remainingHours === null
      ? ""
      : remainingHours <= 0
        ? "We will apply this update now to keep SayWetin current."
        : `If you wait, SayWetin will apply this update automatically in about ${remainingHours} hour${remainingHours === 1 ? "" : "s"}.`;

  return (
    <div
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 animate-in slide-in-from-bottom-5"
      data-testid="notification-update-available"
    >
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="font-medium text-sm">A new SayWetin update is ready</p>
          <p className="text-xs opacity-90">
            We made improvements and fixes. Update now to use the latest version.
          </p>
          {forceText && (
            <p className="text-xs opacity-80 flex items-center gap-1">
              <Clock3 className="w-3 h-3" />
              {forceText}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1"
              data-testid="button-refresh-app"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Update now
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLater}
              disabled={isRefreshing}
              className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              data-testid="button-update-later"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
