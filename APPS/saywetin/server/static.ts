import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Service worker kill-switch:
  // Some older mobile builds may have stale SW registrations. Serve a valid SW
  // script that immediately unregisters itself and clears caches.
  app.get(["/sw.js", "/service-worker.js"], (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
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
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.send(`
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {});
}
`);
  });

  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
        const isHtml = normalizedPath.endsWith("/index.html");
        const isBuildMeta = normalizedPath.endsWith("/_saywetin/build-meta.json");

        if (isHtml || isBuildMeta) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          res.setHeader("Pragma", "no-cache");
        }
      },
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
