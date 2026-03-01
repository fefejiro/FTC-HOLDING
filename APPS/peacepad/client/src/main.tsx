import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installApiFetchPatch } from "./lib/queryClient";

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

createRoot(document.getElementById("root")!).render(<App />);
