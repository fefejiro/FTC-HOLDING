import { queryClient } from './queryClient';

const CURRENT_VERSION = 28;
const VERSION_KEY = 'peacepad_app_version';
const LAST_CACHE_CLEAR_KEY = 'peacepad_last_cache_clear';

interface VersionInfo {
  previousVersion: number | null;
  currentVersion: number;
  isVersionChange: boolean;
  isFirstLoad: boolean;
}

export function getVersionInfo(): VersionInfo {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  const previousVersion = storedVersion ? parseInt(storedVersion, 10) : null;
  
  return {
    previousVersion,
    currentVersion: CURRENT_VERSION,
    isVersionChange: previousVersion !== null && previousVersion !== CURRENT_VERSION,
    isFirstLoad: previousVersion === null
  };
}

export async function clearAllCaches(): Promise<void> {
  console.log('[VersionManager] Clearing all caches...');
  
  try {
    queryClient.clear();
    console.log('[VersionManager] TanStack Query cache cleared');
  } catch (e) {
    console.warn('[VersionManager] Failed to clear query cache:', e);
  }
  
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('[VersionManager] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
      console.log('[VersionManager] Service worker caches cleared');
    } catch (e) {
      console.warn('[VersionManager] Failed to clear SW caches:', e);
    }
  }
  
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        console.log('[VersionManager] Signaled SW to skip waiting');
      }
    } catch (e) {
      console.warn('[VersionManager] Failed to signal SW:', e);
    }
  }
  
  localStorage.setItem(LAST_CACHE_CLEAR_KEY, Date.now().toString());
}

export async function refreshAuthSession(): Promise<boolean> {
  console.log('[VersionManager] Refreshing auth session...');
  
  try {
    const response = await fetch('/api/auth/user', {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.ok) {
      console.log('[VersionManager] Auth session refreshed successfully');
      return true;
    } else {
      console.log('[VersionManager] No active session (expected for guests)');
      return false;
    }
  } catch (e) {
    console.warn('[VersionManager] Failed to refresh auth:', e);
    return false;
  }
}

export async function handleVersionChange(): Promise<{ 
  didClearCache: boolean; 
  versionInfo: VersionInfo;
}> {
  const versionInfo = getVersionInfo();
  
  console.log('[VersionManager] Version check:', {
    previous: versionInfo.previousVersion,
    current: versionInfo.currentVersion,
    isChange: versionInfo.isVersionChange,
    isFirst: versionInfo.isFirstLoad
  });
  
  let didClearCache = false;
  
  if (versionInfo.isVersionChange) {
    console.log(`[VersionManager] Version changed: ${versionInfo.previousVersion} -> ${versionInfo.currentVersion}`);
    
    await clearAllCaches();
    await refreshAuthSession();
    didClearCache = true;
    
    console.log('[VersionManager] Cache clear complete, updating stored version');
  }
  
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION.toString());
  
  return { didClearCache, versionInfo };
}

export function getCurrentVersion(): number {
  return CURRENT_VERSION;
}
