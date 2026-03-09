import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const indexHtmlPath = path.resolve(distPath, "index.html");
  const assetsPath = path.resolve(distPath, "assets");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  function withNoStore(res: any) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
  }

  function getLatestIndexBundlePath(): string | null {
    if (!fs.existsSync(assetsPath)) {
      return null;
    }

    const candidates = fs
      .readdirSync(assetsPath)
      .filter((fileName) => /^index-[^.]+\.js$/i.test(fileName))
      .sort();

    if (candidates.length === 0) {
      return null;
    }

    return path.resolve(assetsPath, candidates[candidates.length - 1]);
  }

  function injectRuntimePatch(html: string): string {
    if (html.includes('id="saywetin-runtime-patch"')) {
      return html;
    }

    const runtimePatch = `
<script id="saywetin-runtime-patch">
(() => {
  const BUILD_META_PATH = "/_saywetin/build-meta.json";
  const KNOWN_BUILD_KEY = "saywetin_runtime_known_build_id";
  const PROMPTED_BUILD_KEY = "saywetin_runtime_prompted_build_id";
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;

  const hideLegacySignInButton = () => {
    try {
      const candidates = document.querySelectorAll('[data-testid="button-login"], button');
      for (const element of candidates) {
        const text = (element.textContent || "").trim().toLowerCase();
        if (text === "sign in") {
          element.style.display = "none";
          element.setAttribute("aria-hidden", "true");
        }
      }
    } catch {}
  };

  const clearCachesAndReload = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {}

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {}

    window.location.reload();
  };

  const checkForUpdate = async () => {
    try {
      const response = await fetch(\`\${BUILD_META_PATH}?ts=\${Date.now()}\`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const currentBuildId = typeof payload?.webBuildId === "string" ? payload.webBuildId.trim() : "";
      if (!currentBuildId) {
        return;
      }

      const knownBuildId = localStorage.getItem(KNOWN_BUILD_KEY);
      if (!knownBuildId) {
        localStorage.setItem(KNOWN_BUILD_KEY, currentBuildId);
        return;
      }

      if (knownBuildId === currentBuildId) {
        return;
      }

      const promptedBuildId = localStorage.getItem(PROMPTED_BUILD_KEY);
      if (promptedBuildId === currentBuildId) {
        return;
      }

      localStorage.setItem(PROMPTED_BUILD_KEY, currentBuildId);
      const shouldRefresh = window.confirm("New Saywetin update ready. Tap OK to refresh now.");
      if (!shouldRefresh) {
        return;
      }

      localStorage.setItem(KNOWN_BUILD_KEY, currentBuildId);
      await clearCachesAndReload();
    } catch {}
  };

  hideLegacySignInButton();
  const observer = new MutationObserver(() => hideLegacySignInButton());
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

  checkForUpdate();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      hideLegacySignInButton();
      checkForUpdate();
    }
  });
  window.addEventListener("focus", () => {
    hideLegacySignInButton();
    checkForUpdate();
  });
  window.setInterval(() => {
    if (document.visibilityState === "visible") {
      checkForUpdate();
    }
  }, CHECK_INTERVAL_MS);
})();
</script>`;

    if (html.includes("</body>")) {
      return html.replace("</body>", `${runtimePatch}\n</body>`);
    }

    return `${html}\n${runtimePatch}`;
  }

  const sendIndexHtml = (_req: express.Request, res: express.Response) => {
    const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
    withNoStore(res);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(injectRuntimePatch(indexHtml));
  };

  // Service worker kill-switch:
  // Some older mobile builds may have stale SW registrations. Serve a valid SW
  // script that immediately unregisters itself and clears caches.
  app.get(["/sw.js", "/service-worker.js"], (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    withNoStore(res);
    res.send(`
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {}
    try {
      await self.registration.unregister();
    } catch {}
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    } catch {}
  })());
});
`);
  });

  // Compatibility endpoint for older PWA bootstrap scripts.
  app.get("/registerSW.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    withNoStore(res);
    res.send(`
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {});
}
`);
  });

  // Healing route for stale HTML shells still requesting an old index-*.js bundle.
  app.get(/^\/assets\/index-[^/]+\.js$/i, (req, res, next) => {
    const requestedPath = path.resolve(distPath, `.${req.path}`);
    if (fs.existsSync(requestedPath)) {
      return next();
    }

    const latestBundle = getLatestIndexBundlePath();
    if (!latestBundle) {
      return next();
    }

    withNoStore(res);
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.sendFile(latestBundle);
  });

  app.use(
    express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
        const isHtml = normalizedPath.endsWith("/index.html");
        const isBuildMeta = normalizedPath.endsWith("/_saywetin/build-meta.json");
        const isIndexChunk = /\/assets\/index-[^/]+\.js$/i.test(normalizedPath);

        if (isHtml || isBuildMeta || isIndexChunk) {
          withNoStore(res);
        }
      },
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", sendIndexHtml);
}
