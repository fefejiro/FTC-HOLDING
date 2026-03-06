import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock3, RefreshCw } from "lucide-react";
import {
  applyWebUpdateNow,
  checkForWebUpdate,
  deferWebUpdate,
  type WebUpdateStatus,
} from "@/lib/webUpdateManager";

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

  const applyUpdate = useCallback(async () => {
    if (isApplyingUpdateRef.current) {
      return;
    }

    isApplyingUpdateRef.current = true;
    setIsRefreshing(true);

    try {
      await applyWebUpdateNow();
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
      await applyUpdate();
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
        evaluateUpdate();
      } else {
        dismissedForCurrentOpenRef.current = false;
      }
    };

    const handleResume = () => {
      dismissedForCurrentOpenRef.current = false;
      evaluateUpdate();
    };

    const handleBackground = () => {
      dismissedForCurrentOpenRef.current = false;
    };

    const handleDetected = () => {
      evaluateUpdate();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("peacepad:app-resume", handleResume);
    window.addEventListener("peacepad:app-background", handleBackground);
    window.addEventListener("peacepad:web-update-detected", handleDetected);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("peacepad:app-resume", handleResume);
      window.removeEventListener("peacepad:app-background", handleBackground);
      window.removeEventListener("peacepad:web-update-detected", handleDetected);
    };
  }, [evaluateUpdate]);

  const handleRefresh = async () => {
    await applyUpdate();
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
        ? "We'll apply this update now to keep PeacePad current."
        : `If you wait, PeacePad will apply this update automatically in about ${remainingHours} hour${remainingHours === 1 ? "" : "s"}.`;

  return (
    <div
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm z-50 animate-in slide-in-from-bottom-5"
      data-testid="notification-update-available"
    >
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="font-medium text-sm">A fresh PeacePad update is ready</p>
          <p className="text-xs opacity-90">
            We made a few improvements for smoother co-parenting. Update now to use the latest version.
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
