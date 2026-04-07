import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  isNativeApp, 
  canUseNotifications, 
  getPermissionStatus, 
  requestNativePushConsent 
} from "@/utils/capacitor-notifications";

interface NotificationPermissionProps {
  user?: { prepChatSessionCount?: number | null; totalMessagesSent?: number | null } | null;
}

export function NotificationPermission({ user }: NotificationPermissionProps = {}) {
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [showBanner, setShowBanner] = useState(false);
  const { toast } = useToast();

  // Only show the prompt after the user has experienced value: completed a prep chat or sent a message.
  const hasExperiencedValue =
    (user?.prepChatSessionCount ?? 0) > 0 || (user?.totalMessagesSent ?? 0) > 0;

  useEffect(() => {
    const checkPermissions = async () => {
      if (!canUseNotifications()) {
        return;
      }
      if (!hasExperiencedValue) {
        return; // Wait until user has sent a message or finished a prep chat session
      }

      const status = await getPermissionStatus();
      setPermissionState(status === 'prompt' ? 'default' : status);

      const dismissed = localStorage.getItem('push_notification_banner_dismissed');
      if (status === 'prompt' && !dismissed) {
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(timer);
      }
    };

    checkPermissions();
  }, [hasExperiencedValue]);

  const requestPermission = async () => {
    try {
      if (isNativeApp()) {
        await requestNativePushConsent();
        setPermissionState("granted");
        toast({
          title: "Notifications Enabled",
          description: "You'll receive notifications for urgent messages and schedule changes",
          duration: 4000,
        });
        setShowBanner(false);
        localStorage.setItem('push_notification_banner_dismissed', 'true');
        return;
      }

      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        
        const response = await fetch('/api/push/vapid-public-key');
        const { publicKey } = await response.json();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await apiRequest("POST", "/api/push/subscribe", {
          subscription: subscription.toJSON(),
        });

        toast({
          title: "Notifications Enabled",
          description: "You'll receive notifications for urgent messages and schedule changes",
          duration: 4000,
        });

        setShowBanner(false);
        localStorage.setItem('push_notification_banner_dismissed', 'true');
      } else if (permission === "denied") {
        toast({
          title: "Notifications Blocked",
          description: "You can enable them in your browser settings",
          variant: "destructive",
          duration: 5000,
        });
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again from Settings.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('push_notification_banner_dismissed', 'true');
  };

  // Don't show anything if notifications not supported
  if (!canUseNotifications()) {
    return null;
  }

  // Show compact banner at top if permission not granted
  if (showBanner && permissionState === "default") {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-primary text-primary-foreground shadow-lg safe-area-top">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Bell className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Get notified when your co-parent replies</p>
              <p className="text-xs opacity-80 mt-0.5">We only notify you for messages — nothing else.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={requestPermission}
              data-testid="button-enable-notifications"
            >
              Enable
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismissBanner}
              className="h-8 w-8 p-0"
              data-testid="button-dismiss-notification-banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
