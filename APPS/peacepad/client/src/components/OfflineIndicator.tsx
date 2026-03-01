import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <Badge variant="destructive" className="gap-2 py-2 px-4 shadow-lg">
        <WifiOff className="h-4 w-4" />
        <span className="font-medium">You're offline</span>
      </Badge>
    </div>
  );
}
