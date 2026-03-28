import { type Express } from 'express';
import { createServer as createViteServer, createLogger } from 'vite';
import { type Server } from 'http';
import viteConfig from '../vite.config';
import fs from 'fs';
import path from 'path';

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const runtimeViteConfig = viteConfig as Record<string, unknown>;

  const vite = await createViteServer({
    ...runtimeViteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server, path: '/vite-hmr' },
      allowedHosts: true as const,
    },
    appType: 'custom',
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        '..',
        'client',
        'index.html',
      );

      let template = await fs.promises.readFile(clientTemplate, 'utf-8');
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
