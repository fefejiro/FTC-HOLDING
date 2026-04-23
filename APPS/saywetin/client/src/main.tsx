import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAnalytics, trackAppOpened } from "./lib/analytics";
import {
  getApiBaseUrl,
  getApiBaseUrlSource,
  getCanonicalUrlForCurrentLocation,
  installApiFetchPatch,
} from "./lib/api-config";

const SERVICE_WORKER_ENABLED = import.meta.env.VITE_ENABLE_SW === "true";
const canonicalRedirectTarget = getCanonicalUrlForCurrentLocation();
const shouldRedirectToCanonicalHost = Boolean(
  canonicalRedirectTarget && canonicalRedirectTarget !== window.location.href,
);

installApiFetchPatch();
initAnalytics();

console.info("[Saywetin] Frontend build", {
  ...__SAYWETIN_FRONTEND_BUILD__,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "auto",
});
console.info("[Saywetin] API routing", {
  selectedBaseUrl: getApiBaseUrl(),
  source: getApiBaseUrlSource(),
  origin: typeof window !== 'undefined' ? window.location.origin : null,
  isNativeRuntime: typeof window !== 'undefined' ? !!window.Capacitor?.isNativePlatform?.() : false,
});

if (shouldRedirectToCanonicalHost && canonicalRedirectTarget) {
  window.location.replace(canonicalRedirectTarget);
} else {
  trackAppOpened({ referrer: document.referrer || null });
  // Early native platform marker classes before React mounts.
  (async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      const platform = Capacitor.getPlatform();

      if (platform === "android") {
        document.body.classList.add("capacitor-android");
      } else if (platform === "ios") {
        document.body.classList.add("capacitor-ios");
      }

      if (Capacitor.isNativePlatform()) {
        document.body.classList.add("capacitor-native");
      }
    } catch {
      // Browser runtime outside Capacitor.
    }
  })();

  // PeacePad-style safety valve: disable service worker unless explicitly enabled.
  if (!SERVICE_WORKER_ENABLED && "serviceWorker" in navigator) {
    (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
      } catch (error) {
        console.warn("[SW] Failed to unregister existing service workers:", error);
      }
    })();
  }

  createRoot(document.getElementById("root")!).render(<App />);
}
