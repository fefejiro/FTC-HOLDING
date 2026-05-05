import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, 'public');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const isServiceWorker = normalizedPath.endsWith('/sw.js');
        const isManifest = normalizedPath.endsWith('/manifest.json');

        if (filePath.endsWith('.html') || isServiceWorker || isManifest) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }

        if (isServiceWorker) {
          res.setHeader('Service-Worker-Allowed', '/');
        }
      },
    }),
  );

  app.use('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
