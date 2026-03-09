export const WEB_BUILD_META_PATH = "/_saywetin/build-meta.json";
export const WEB_BUILD_ID_KEY = "saywetin_web_build_id";
export const WEB_PENDING_BUILD_ID_KEY = "saywetin_pending_web_build_id";
export const WEB_UPDATE_DEFERRED_KEY = "saywetin_update_deferred";
export const WEB_UPDATE_FORCE_AFTER_KEY = "saywetin_update_force_after";
export const WEB_FORCE_UPDATE_DELAY_MS = 24 * 60 * 60 * 1000;
export const WEB_REMOTE_BUILD_META_URL = "https://saywetin.app/_saywetin/build-meta.json";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.saywetin.app";

export interface WebBuildMeta {
  webBuildId: string;
  deployedAt?: string;
  gitSha?: string;
}

export interface WebUpdateStatus {
  updateAvailable: boolean;
  forceUpdateRequired: boolean;
  currentBuildId?: string;
  knownBuildId?: string | null;
  deferred: boolean;
  forceAfterMs?: number;
}

export interface CheckWebUpdateOptions {
  fetchImpl?: typeof fetch;
  storage?: StorageLike;
  nowMs?: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isNativePlatformRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return !!window.Capacitor?.isNativePlatform?.();
}

export function isNativeLocalShellRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (!isNativePlatformRuntime()) {
    return false;
  }

  const protocol = window.location.protocol.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  return protocol === "capacitor:" || hostname === "localhost";
}

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function parseForceAfter(rawValue: string | null): number | null {
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function clearUpdateFlags(storage: StorageLike): void {
  storage.removeItem(WEB_UPDATE_DEFERRED_KEY);
  storage.removeItem(WEB_UPDATE_FORCE_AFTER_KEY);
  storage.removeItem(WEB_PENDING_BUILD_ID_KEY);
}

async function performHardRefresh(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (error) {
      console.warn("[WebUpdateManager] Failed to clear caches:", error);
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn("[WebUpdateManager] Failed to unregister service workers:", error);
    }
  }

  window.location.reload();
}

function syncBuildState(storage: StorageLike, currentBuildId: string, nowMs: number): WebUpdateStatus {
  const knownBuildId = storage.getItem(WEB_BUILD_ID_KEY);

  if (!knownBuildId) {
    storage.setItem(WEB_BUILD_ID_KEY, currentBuildId);
    clearUpdateFlags(storage);

    return {
      updateAvailable: false,
      forceUpdateRequired: false,
      currentBuildId,
      knownBuildId: null,
      deferred: false,
    };
  }

  if (knownBuildId === currentBuildId) {
    clearUpdateFlags(storage);
    return {
      updateAvailable: false,
      forceUpdateRequired: false,
      currentBuildId,
      knownBuildId,
      deferred: false,
    };
  }

  storage.setItem(WEB_PENDING_BUILD_ID_KEY, currentBuildId);

  let forceAfterMs = parseForceAfter(storage.getItem(WEB_UPDATE_FORCE_AFTER_KEY));
  if (!forceAfterMs) {
    forceAfterMs = nowMs + WEB_FORCE_UPDATE_DELAY_MS;
    storage.setItem(WEB_UPDATE_FORCE_AFTER_KEY, String(forceAfterMs));
  }

  const deferred = storage.getItem(WEB_UPDATE_DEFERRED_KEY) === "true";

  return {
    updateAvailable: true,
    forceUpdateRequired: nowMs >= forceAfterMs,
    currentBuildId,
    knownBuildId,
    deferred,
    forceAfterMs,
  };
}

function syncNativeLocalShellBuildState(
  storage: StorageLike,
  localBuildId: string,
  remoteBuildId: string,
  nowMs: number,
): WebUpdateStatus {
  if (!localBuildId) {
    return syncBuildState(storage, remoteBuildId, nowMs);
  }

  storage.setItem(WEB_BUILD_ID_KEY, localBuildId);

  if (localBuildId === remoteBuildId) {
    clearUpdateFlags(storage);
    return {
      updateAvailable: false,
      forceUpdateRequired: false,
      currentBuildId: localBuildId,
      knownBuildId: remoteBuildId,
      deferred: false,
    };
  }

  storage.setItem(WEB_PENDING_BUILD_ID_KEY, remoteBuildId);

  let forceAfterMs = parseForceAfter(storage.getItem(WEB_UPDATE_FORCE_AFTER_KEY));
  if (!forceAfterMs) {
    forceAfterMs = nowMs + WEB_FORCE_UPDATE_DELAY_MS;
    storage.setItem(WEB_UPDATE_FORCE_AFTER_KEY, String(forceAfterMs));
  }

  const deferred = storage.getItem(WEB_UPDATE_DEFERRED_KEY) === "true";

  return {
    updateAvailable: true,
    forceUpdateRequired: nowMs >= forceAfterMs,
    currentBuildId: localBuildId,
    knownBuildId: remoteBuildId,
    deferred,
    forceAfterMs,
  };
}

async function fetchWebBuildMetaFromUrl(
  targetUrl: string,
  fetchImpl: typeof fetch,
  nowMs: number,
): Promise<WebBuildMeta | null> {
  const separator = targetUrl.includes("?") ? "&" : "?";
  const versionedUrl = `${targetUrl}${separator}ts=${nowMs}`;
  const response = await fetchImpl(versionedUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    return null;
  }

  const parsed = (await response.json()) as Partial<WebBuildMeta>;
  const webBuildId = typeof parsed?.webBuildId === "string" ? parsed.webBuildId.trim() : "";
  if (!webBuildId) {
    return null;
  }

  return {
    webBuildId,
    deployedAt: typeof parsed?.deployedAt === "string" ? parsed.deployedAt : undefined,
    gitSha: typeof parsed?.gitSha === "string" ? parsed.gitSha : undefined,
  };
}

export async function fetchWebBuildMeta(
  fetchImpl: typeof fetch = fetch,
  nowMs: number = Date.now(),
): Promise<WebBuildMeta | null> {
  return fetchWebBuildMetaFromUrl(WEB_BUILD_META_PATH, fetchImpl, nowMs);
}

export async function checkForWebUpdate(options: CheckWebUpdateOptions = {}): Promise<WebUpdateStatus> {
  const nowMs = options.nowMs ?? Date.now();
  const storage = getStorage(options.storage);
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!storage) {
    return {
      updateAvailable: false,
      forceUpdateRequired: false,
      deferred: false,
    };
  }

  try {
    if (isNativeLocalShellRuntime()) {
      const [localMeta, remoteMeta] = await Promise.all([
        fetchWebBuildMetaFromUrl(WEB_BUILD_META_PATH, fetchImpl, nowMs),
        fetchWebBuildMetaFromUrl(WEB_REMOTE_BUILD_META_URL, fetchImpl, nowMs),
      ]);

      if (!remoteMeta?.webBuildId) {
        return {
          updateAvailable: false,
          forceUpdateRequired: false,
          deferred: storage.getItem(WEB_UPDATE_DEFERRED_KEY) === "true",
        };
      }

      const localBuildId = localMeta?.webBuildId || storage.getItem(WEB_BUILD_ID_KEY) || "";
      return syncNativeLocalShellBuildState(storage, localBuildId, remoteMeta.webBuildId, nowMs);
    }

    const meta = await fetchWebBuildMeta(fetchImpl, nowMs);
    if (!meta?.webBuildId) {
      return {
        updateAvailable: false,
        forceUpdateRequired: false,
        deferred: storage.getItem(WEB_UPDATE_DEFERRED_KEY) === "true",
      };
    }

    return syncBuildState(storage, meta.webBuildId, nowMs);
  } catch (error) {
    console.warn("[WebUpdateManager] Failed to check web build metadata:", error);
    return {
      updateAvailable: false,
      forceUpdateRequired: false,
      deferred: storage.getItem(WEB_UPDATE_DEFERRED_KEY) === "true",
    };
  }
}

export function deferWebUpdate(storage?: StorageLike, nowMs: number = Date.now()): void {
  const localStorageRef = getStorage(storage);
  if (!localStorageRef) {
    return;
  }

  localStorageRef.setItem(WEB_UPDATE_DEFERRED_KEY, "true");

  const existingForceAfter = parseForceAfter(localStorageRef.getItem(WEB_UPDATE_FORCE_AFTER_KEY));
  if (!existingForceAfter) {
    localStorageRef.setItem(WEB_UPDATE_FORCE_AFTER_KEY, String(nowMs + WEB_FORCE_UPDATE_DELAY_MS));
  }
}

export async function applyWebUpdateNow(
  storage?: StorageLike,
  refreshHandler: () => Promise<void> = performHardRefresh,
): Promise<void> {
  if (isNativeLocalShellRuntime()) {
    if (typeof window !== "undefined") {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
    }
    return;
  }

  const localStorageRef = getStorage(storage);
  if (localStorageRef) {
    const pendingBuild = localStorageRef.getItem(WEB_PENDING_BUILD_ID_KEY);
    if (pendingBuild) {
      localStorageRef.setItem(WEB_BUILD_ID_KEY, pendingBuild);
    }
    clearUpdateFlags(localStorageRef);
  }

  await refreshHandler();
}
