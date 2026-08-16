(() => {
  "use strict";

  const APP_ORIGIN = "https://jobagent.unalabs.cloud";
  const capacitor = window.Capacitor;
  const isNative = Boolean(capacitor?.isNativePlatform?.());

  function safeAppUrl(value) {
    try {
      const url = new URL(value);
      return url.origin === APP_ORIGIN ? `${url.pathname}${url.search}${url.hash}` : null;
    } catch {
      return null;
    }
  }

  async function openExternal(value) {
    const url = new URL(value, APP_ORIGIN);
    if (url.protocol !== "https:") throw new Error("Only secure external links are allowed.");
    if (isNative && capacitor?.Plugins?.Browser?.open) {
      await capacitor.Plugins.Browser.open({ url: url.href, presentationStyle: "popover" });
      return;
    }
    window.location.assign(url.href);
  }

  window.JobAgentNative = Object.freeze({ isNative, openExternal, safeAppUrl });

  if (!isNative || !capacitor?.Plugins?.App?.addListener) return;

  capacitor.Plugins.App.addListener("appUrlOpen", ({ url }) => {
    const destination = safeAppUrl(url);
    if (destination) window.location.assign(destination);
  });

  capacitor.Plugins.App.addListener("appStateChange", async ({ isActive }) => {
    if (!isActive) return;
    try {
      await capacitor.Plugins.Browser?.close?.();
    } catch {
      // The system browser may already be closed.
    }
    window.dispatchEvent(new CustomEvent("jobagent:native-resume"));
  });
})();
