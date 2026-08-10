import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { serveStatic } from './static';
import { createServer } from 'http';
import cors, { type CorsOptions } from 'cors';
import { initPush } from './push';
import { startIncidentMonitor, startWazeMonitor } from './monitor';
import { canAccessAdminSurface } from './adminAccess';
import { ensureDispatchIncidentWorkflowColumns } from './db';
import { randomUUID } from 'crypto';

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
  'https://dispatch-admin.unalabs.cloud',
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.set('trust proxy', 1);

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

app.use((req, res, next) => {
  const suppliedRequestId = req.header('x-request-id');
  const requestId = suppliedRequestId && requestIdPattern.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.locals.requestId = requestId;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health checks
const healthPayload = () => ({
  status: 'ok',
  service: 'dispatch',
  version: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'local',
  time: new Date().toISOString(),
});

app.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(healthPayload());
});
app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(healthPayload());
});
app.get('/readyz', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(healthPayload());
});
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
      let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms requestId=${res.locals.requestId}`;
      if (capturedJson) line += ` :: ${JSON.stringify(capturedJson)}`;
      log(line);
    }
  });

  next();
});

(async () => {
  await ensureDispatchIncidentWorkflowColumns();
  initPush();
  startIncidentMonitor();
  startWazeMonitor();

  await registerRoutes(httpServer, app);

  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'API_NOT_FOUND', message: 'API route not found' },
      requestId: res.locals.requestId,
    });
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const candidateStatus = Number((err as any)?.status || (err as any)?.statusCode || 500);
    const status = Number.isInteger(candidateStatus) && candidateStatus >= 400 && candidateStatus <= 599
      ? candidateStatus
      : 500;
    const isServerError = status >= 500;
    const message = isServerError && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : (err as any)?.message || 'Internal Server Error';
    console.error(`[Error] requestId=${res.locals.requestId}`, err);
    res.status(status).json({
      success: false,
      error: { code: isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED', message },
      requestId: res.locals.requestId,
    });
  });

  app.use((req, res, next) => {
    if (req.path === '/admin' || req.path.startsWith('/admin/')) {
      if (canAccessAdminSurface(req)) {
        next();
        return;
      }
      res.status(404).send('Not found');
      return;
    }

    next();
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
