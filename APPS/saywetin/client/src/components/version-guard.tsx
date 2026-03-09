import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getCurrentVersion, handleVersionChange } from "@/lib/version-manager";

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkVersion = async () => {
      try {
        const { didClearCache } = await handleVersionChange();
        if (!mounted) {
          return;
        }

        if (didClearCache) {
          setIsClearing(true);
          await new Promise((resolve) => setTimeout(resolve, 700));
          window.location.reload();
          return;
        }

        setIsReady(true);
      } catch (error) {
        console.error("[Saywetin VersionGuard] Version check failed:", error);
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    checkVersion();

    return () => {
      mounted = false;
    };
  }, []);

  if (isClearing) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Updating Saywetin to v{getCurrentVersion()}...</p>
      </div>
    );
  }

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
