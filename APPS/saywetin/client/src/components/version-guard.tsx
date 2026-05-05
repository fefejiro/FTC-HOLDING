import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getCurrentVersion, handleVersionChange } from "@/lib/version-manager";

const VERSION_GUARD_TIMEOUT_MS = 6000;
const VERSION_GUARD_RELOAD_KEY = "saywetin_version_guard_reload_count";
const MAX_VERSION_GUARD_RELOADS = 1;

function getReloadCount(): number {
  try {
    const raw = sessionStorage.getItem(VERSION_GUARD_RELOAD_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function setReloadCount(count: number): void {
  try {
    sessionStorage.setItem(VERSION_GUARD_RELOAD_KEY, String(count));
  } catch {
    // Ignore storage failures.
  }
}

function resetReloadCount(): void {
  setReloadCount(0);
}

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Prevent indefinite blank screens if version bootstrap hangs on some WebViews.
    const startupGuardTimer = window.setTimeout(() => {
      if (!mounted) {
        return;
      }

      console.warn("[Saywetin VersionGuard] Startup guard timeout hit; continuing app bootstrap.");
      setIsClearing(false);
      setIsReady(true);
    }, VERSION_GUARD_TIMEOUT_MS);

    const checkVersion = async () => {
      try {
        const { didClearCache } = await handleVersionChange();
        if (!mounted) {
          return;
        }

        if (didClearCache) {
          setIsClearing(true);
          await new Promise((resolve) => setTimeout(resolve, 700));

          const nextReloadCount = getReloadCount() + 1;
          if (nextReloadCount <= MAX_VERSION_GUARD_RELOADS) {
            setReloadCount(nextReloadCount);
            window.location.reload();
            return;
          }

          console.warn("[Saywetin VersionGuard] Reload limit reached; skipping additional reload.");
          setIsClearing(false);
          setIsReady(true);
          return;
        }

        resetReloadCount();
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
      window.clearTimeout(startupGuardTimer);
    };
  }, []);

  if (isClearing) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: "#0a0a0f", color: "#ffffff" }}
      >
        <RefreshCw className="h-8 w-8 animate-spin" style={{ color: "#7c3aed" }} />
        <p className="text-sm" style={{ color: "#a1a1aa" }}>Updating Saywetin to v{getCurrentVersion()}...</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: "#0a0a0f", color: "#ffffff" }}
        aria-live="polite"
      >
        <span className="text-sm" style={{ color: "#a1a1aa" }}>Loading Saywetin...</span>
      </div>
    );
  }

  return <>{children}</>;
}
