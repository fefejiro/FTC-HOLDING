import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // DISABLED: Version check was causing infinite refresh loop in dev
    // This prevented WebSocket connections from stabilizing
    // Only enable in production if needed
    console.log('[UpdateNotification] Version checking disabled to prevent refresh loop');
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Skip waiting and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
    
    // Reload after a short delay to let service worker activate
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm z-50 animate-in slide-in-from-bottom-5"
      data-testid="notification-update-available"
    >
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Update Available</p>
          <p className="text-xs opacity-90 mt-1">
            A new version of PeacePad is ready. Refresh to get the latest features.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex-shrink-0"
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
              Refresh
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
