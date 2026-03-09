import { queryClient } from "./queryClient";

const CURRENT_VERSION = 3;
const VERSION_KEY = "saywetin_app_version";
const NATIVE_BOOTSTRAP_REFRESH_KEY = "saywetin_native_bootstrap_refresh";

interface VersionInfo {
  previousVersion: number | null;
  currentVersion: number;
  isVersionChange: boolean;
  isFirstLoad: boolean;
}

function isNativePlatform(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean((window as any).Capacitor?.isNativePlatform?.());
}

function getVersionInfo(): VersionInfo {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  const previousVersion = storedVersion ? Number.parseInt(storedVersion, 10) : null;

  return {
    previousVersion,
    currentVersion: CURRENT_VERSION,
    isVersionChange: previousVersion !== null && previousVersion !== CURRENT_VERSION,
    isFirstLoad: previousVersion === null,
  };
}

async function clearAllCaches(): Promise<void> {
  try {
    queryClient.clear();
  } catch (error) {
    console.warn("[Saywetin VersionManager] Failed to clear query cache:", error);
  }

  if (typeof window === "undefined") {
    return;
  }

  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    } catch (error) {
      console.warn("[Saywetin VersionManager] Failed to clear web caches:", error);
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn("[Saywetin VersionManager] Failed to unregister service workers:", error);
    }
  }
}

export async function handleVersionChange(): Promise<{ didClearCache: boolean; versionInfo: VersionInfo }> {
  const versionInfo = getVersionInfo();
  let didClearCache = false;

  if (versionInfo.isVersionChange) {
    await clearAllCaches();
    didClearCache = true;
  }

  const nativeBootstrapRefreshed = localStorage.getItem(NATIVE_BOOTSTRAP_REFRESH_KEY) === "true";
  if (!didClearCache && versionInfo.isFirstLoad && isNativePlatform() && !nativeBootstrapRefreshed) {
    await clearAllCaches();
    didClearCache = true;
    localStorage.setItem(NATIVE_BOOTSTRAP_REFRESH_KEY, "true");
  }

  localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));

  return {
    didClearCache,
    versionInfo,
  };
}

export function getCurrentVersion(): number {
  return CURRENT_VERSION;
}
