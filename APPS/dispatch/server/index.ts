import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { serveStatic } from './static';
import { createServer } from 'http';
import cors, { type CorsOptions } from 'cors';
import { initPush } from './push';
import { startIncidentMonitor } from './monitor';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = new Set([
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3500',
  'http://127.0.0.1:3500',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'https://dispatch.unalabs.cloud',
  'http://dispatch.unalabs.cloud',
  'https://dispatch-api-production.up.railway.app',
  'https://dispatch-edge.fejiro-efiuvwere.workers.dev',
]);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    console.warn(`[CORS] Origin not allowed: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health checks
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/__health', (_req, res) => res.status(200).send('OK'));

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJson: Record<string, unknown> | undefined;

  const originalJson = res.json;
  res.json = function (body, ...args) {
    capturedJson = body;
    return originalJson.apply(res, [body, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJson) line += ` :: ${JSON.stringify(capturedJson)}`;
      log(line);
    }
  });

  next();
});

(async () => {
  initPush();
  startIncidentMonitor();

  await registerRoutes(httpServer, app);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any)?.status || (err as any)?.statusCode || 500;
    const message = (err as any)?.message || 'Internal Server Error';
    console.error(err);
    res.status(status).json({ error: message });
  });

  if (process.env.NODE_ENV === 'production') {
    serveStatic(app);
  } else {
    const { setupVite } = await import('./vite');
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || '8080', 10);
  httpServer.listen({ port, host: '0.0.0.0' }, () => {
    log(`dispatch server running on port ${port}`);
  });
})();
