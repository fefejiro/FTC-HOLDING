import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installApiFetchPatch } from "./lib/queryClient";

const SERVICE_WORKER_ENABLED = import.meta.env.VITE_ENABLE_SW === "true";

installApiFetchPatch();

// Early platform detection for safe-area CSS (runs before React mounts)
(async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform();
    
    if (platform === 'android') {
      document.body.classList.add('capacitor-android');
    } else if (platform === 'ios') {
      document.body.classList.add('capacitor-ios');
    }
    
    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('capacitor-native');
      
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setBackgroundColor({ color: '#00000000' });
        await StatusBar.setStyle({ style: Style.Light });
        console.log('[StatusBar] Configured: overlay=true, transparent background');
      } catch (sbErr) {
        console.warn('[StatusBar] Plugin not available:', sbErr);
      }
    }
  } catch (e) {
    // Not running in Capacitor
  }
})();

// Emergency safety valve:
// Keep Service Worker disabled unless explicitly enabled via VITE_ENABLE_SW=true.
// This prevents stale/corrupted SW fetch handlers from breaking app navigation.
if (!SERVICE_WORKER_ENABLED && "serviceWorker" in navigator) {
  (async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name.startsWith("peacepad-"))
            .map((name) => caches.delete(name)),
        );
      }

      console.warn("[SW] Disabled by config (VITE_ENABLE_SW!=true). Existing workers unregistered.");
    } catch (error) {
      console.warn("[SW] Failed to unregister existing service workers:", error);
    }
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
