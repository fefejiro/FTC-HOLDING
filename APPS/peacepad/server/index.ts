import express, { type Request, Response, NextFunction } from "express";
import cors, { type CorsOptions } from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testMonitor } from "./testMonitor";
import { startConchSessionCleanup } from "./conchSessionCleanup";
import { startCallCleanup } from "./callCleanup";
import { startGuestSessionCleanup } from "./guestSessionCleanup";
import { initializeWeeklyReportScheduler } from "./weeklyReport";
import { initializeReEngagementScheduler } from "./services/reEngagementScheduler";
import { setupSoftAuth } from "./softAuth";
import { killProcessOnPort, HealthMonitor, setupAutoCleanup } from "./autoRecovery";
import path from "path";
import { randomUUID } from "crypto";
import { axiomTransport, createLogger } from "@ftc/logger";
import { config } from "./config";

// Detect build mode for Play Store APK/AAB builds
const isBuildMode = process.env.BUILD_MODE === 'true' || process.env.PLAY_STORE_BUILD === 'true';

// Enable garbage collection hooks if available (nodejs --expose-gc flag)
if (global.gc && isBuildMode) {
  console.log('[Memory] Garbage collection enabled in build mode');
  // Run garbage collection every 30 seconds during build mode to prevent memory bloat
  setInterval(() => {
    global.gc!();
  }, 30000);
}

// Generate build ID at server startup (timestamp-based for simplicity)
export const BUILD_ID = Date.now().toString();

const app = express();

function normalizeRequestId(value: unknown): string | null {
  const safe = String(value ?? "").trim();
  if (!safe) return null;
  return safe.slice(0, 120);
}

const axiomToken = process.env.AXIOM_TOKEN || "";
const axiomDataset = process.env.AXIOM_DATASET_PEACEPAD || process.env.AXIOM_DATASET || "";
const serviceLogger = createLogger("peacepad-api", {
  context: { source: "peacepad-api" },
  transports: axiomToken && axiomDataset ? [axiomTransport({ token: axiomToken, dataset: axiomDataset })] : [],
});

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
}

function jsonRpcResponse(id: JsonRpcId, payload: { result?: unknown; error?: JsonRpcError }): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    ...payload,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sendRpcError(
  res: Response,
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
) {
  res.status(200).json(
    jsonRpcResponse(id, {
      error: {
        code,
        message,
        ...(data !== undefined ? { data } : {}),
      },
    }),
  );
}

const mcpTools = [
  {
    name: "peacepad_health_check",
    description: "Check PeacePad API health status.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "peacepad_links",
    description: "Get key PeacePad public links for support and terms.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

// Health endpoints stay first so probes return quickly.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});
app.get('/mcp', (_req, res) => {
  res.status(200).json({
    service: "peacepad-mcp",
    protocol: "jsonrpc-2.0",
    methods: ["initialize", "tools/list", "tools/call"],
  });
});
app.post('/mcp', express.json(), async (req: Request, res: Response) => {
  const rpc = req.body as JsonRpcRequest;
  const id: JsonRpcId = rpc?.id ?? null;

  if (!isRecord(rpc) || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") {
    sendRpcError(res, id, -32600, "Invalid Request");
    return;
  }

  // Notification style methods do not require a JSON-RPC response body.
  if (rpc.method.startsWith("notifications/")) {
    res.status(202).end();
    return;
  }

  if (rpc.method === "initialize") {
    res.status(200).json(
      jsonRpcResponse(id, {
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: "peacepad-mcp",
            version: "1.0.0",
          },
          instructions:
            "Use peacepad_links for public URLs and peacepad_health_check for service status.",
        },
      }),
    );
    return;
  }

  if (rpc.method === "tools/list") {
    res.status(200).json(
      jsonRpcResponse(id, {
        result: {
          tools: mcpTools,
        },
      }),
    );
    return;
  }

  if (rpc.method === "tools/call") {
    if (!isRecord(rpc.params) || typeof rpc.params.name !== "string") {
      sendRpcError(res, id, -32602, "Invalid params");
      return;
    }

    const toolName = rpc.params.name;

    if (toolName === "peacepad_health_check") {
      res.status(200).json(
        jsonRpcResponse(id, {
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({ status: "ok", timestamp: Date.now() }),
              },
            ],
          },
        }),
      );
      return;
    }

    if (toolName === "peacepad_links") {
      res.status(200).json(
        jsonRpcResponse(id, {
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  website: "https://peacepad.ca",
                  support: "https://peacepad.ca/support",
                  terms: "https://peacepad.ca/terms",
                  apiHealth: "https://api.peacepad.ca/health",
                }),
              },
            ],
          },
        }),
      );
      return;
    }

    sendRpcError(res, id, -32601, `Unknown tool: ${toolName}`);
    return;
  }

  sendRpcError(res, id, -32601, `Method not found: ${rpc.method}`);
});

const allowedOrigins = new Set(config.cors.allowedOrigins);
const allowedOriginHosts = new Set(
  config.cors.allowedOrigins
    .map((entry) => {
      if (!entry || entry === "*") return undefined;
      try {
        return new URL(entry).hostname.toLowerCase();
      } catch {
        return undefined;
      }
    })
    .filter((entry): entry is string => Boolean(entry)),
);
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has("*")) {
      callback(null, true);
      return;
    }

    // Developer convenience: allow local extension iteration without registering
    // every temporary extension ID. Keep production explicit.
    if (process.env.NODE_ENV !== "production" && origin.startsWith("chrome-extension://")) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    try {
      const parsed = new URL(origin);
      const normalizedOrigin = parsed.origin;
      const host = parsed.hostname.toLowerCase();
      if (allowedOrigins.has(normalizedOrigin) || allowedOriginHosts.has(host)) {
        callback(null, true);
        return;
      }
    } catch {
      // Ignore parse failures and treat as disallowed.
    }

    console.warn(`[CORS] Origin not allowed: ${origin}`);
    callback(null, false);
  },
  credentials: config.cors.allowCredentials,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.set("trust proxy", 1);

app.use((req: any, res, next) => {
  const requestId =
    normalizeRequestId(req.headers["x-request-id"]) ||
    normalizeRequestId(req.headers["x-correlation-id"]) ||
    randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Override external CSP with WebRTC-compatible policy
app.use((req, res, next) => {
  const frameAncestorOrigins = config.app.origins.filter((origin) =>
    origin.startsWith("http://") || origin.startsWith("https://"),
  );
  const frameAncestors = ["'self'", ...frameAncestorOrigins].join(" ");
  
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self' blob: data:;",
      "connect-src 'self' wss: https:;",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://*.firebaseio.com;",
      "img-src 'self' data: blob: https:;",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
      "font-src 'self' https://fonts.gstatic.com;",
      "media-src 'self' blob: data:;",
      "object-src 'none';",
      `frame-ancestors ${frameAncestors};`,
      "worker-src 'self' blob:;"
    ].join(" ")
  );
  next();
});

// Track active connections and monitor API performance
  let activeConnections = 0;
  
  app.use((req: any, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = normalizeRequestId(req.requestId) || randomUUID();

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Track API call in monitor (exclude monitor endpoints)
      const isMonitorEndpoint = path.startsWith('/api/test-monitor');
      const isExpected401 = path === '/api/auth/user' && res.statusCode === 401;
      
      if (!isMonitorEndpoint && !isExpected401) {
        testMonitor.trackAPICall(path, duration, res.statusCode);
      }
      
      // Note: User tracking moved to routes.ts after auth middleware
      // so req.user is populated
      
      const logPayload = {
        requestId,
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: duration,
      };
      if (res.statusCode >= 500) {
        serviceLogger.error("api_request_failed", logPayload);
      } else if (res.statusCode >= 400) {
        serviceLogger.warn("api_request_client_error", logPayload);
      } else {
        serviceLogger.info("api_request_completed", logPayload);
      }
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Serve uploaded files statically with proper MIME types
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    // Ensure proper MIME types for audio files
    if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm');
    } else if (filePath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (filePath.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/ogg');
    }
  }
}));

(async () => {
  // Setup guest authentication (must be before registerRoutes)
  await setupSoftAuth(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = normalizeRequestId(((_req as any).requestId)) || randomUUID();

    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.setHeader("x-request-id", requestId);
      res.status(status).json({ message });
    }

    // Log the error but don't throw it (prevents double-sending headers)
    if (status >= 500) {
      serviceLogger.error("server_error", {
        requestId,
        status,
        path: _req.path,
        method: _req.method,
        message: err?.message || message,
      });
      console.error('Server error:', err);
    }
  });

  // Importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes.
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    if (config.deployment.serveFrontend) {
      serveStatic(app);
    } else {
      console.log("[Deploy] API-only mode enabled; static frontend serving is disabled.");
      app.use("*", (req, res) => {
        if (req.path.startsWith("/api/") || req.path === "/health" || req.path === "/mcp") {
          res.status(404).json({ message: "Endpoint not found" });
          return;
        }

        res.status(404).json({
          message: "This host only serves the PeacePad API. Use https://peacepad.ca for the web app.",
        });
      });
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = config.server.port;
  
  // SMART AUTO-RECOVERY: Clear port before starting
  console.log('[Auto-Recovery] Initializing smart startup sequence...');
  await killProcessOnPort(port);
  
  // Helper function to start server with retry on EADDRINUSE
  const startServer = (retryCount = 0, maxRetries = 3): Promise<void> => {
    return new Promise((resolve, reject) => {
      const serverInstance = server.listen({
        port,
        host: config.server.host,
        ...(process.platform === "win32" ? {} : { reusePort: true }),
      }, () => {
        log(`serving on port ${port}`);
        console.log('[Auto-Recovery] Server started successfully');

        // Suppress the verbose Replit ASCII art in console
        if (config.isProduction) {
          console.log = () => {}; // Suppress console logs in production
        }
        resolve();
      });

      serverInstance.on('error', async (err: any) => {
        if (err.code === 'EADDRINUSE' && retryCount < maxRetries) {
          console.log(`[Auto-Recovery] Port ${port} conflict detected (attempt ${retryCount + 1}/${maxRetries})`);
          
          // Automatically kill conflicting process
          await killProcessOnPort(port);
          
          setTimeout(() => {
            startServer(retryCount + 1, maxRetries).then(resolve).catch(reject);
          }, 2000);
        } else {
          reject(err);
        }
      });
    });
  };

  await startServer();

  // Start smart health monitoring system
  const healthMonitor = new HealthMonitor();
  healthMonitor.start();
  console.log('[Auto-Recovery] Health monitor active - system will auto-recover from issues');

  // Setup automatic cleanup on shutdown
  setupAutoCleanup();

  // Start Conch Mode session cleanup service
  startConchSessionCleanup();

  // Start call cleanup service (marks stuck ringing calls as missed after 60 seconds)
  startCallCleanup();

  // Start daily cleanup for expired guest sessions + guest-scoped data
  startGuestSessionCleanup();

  // Initialize weekly report scheduler (sends reports every Monday at 9:00 AM)
  initializeWeeklyReportScheduler();

  // Initialize re-engagement push scheduler (runs daily at 10:00 AM)
  initializeReEngagementScheduler();

  // Graceful shutdown handlers to prevent EADDRINUSE errors
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    // Stop health monitor
    healthMonitor.stop();
    console.log('[Auto-Recovery] Health monitor stopped');
    
    // Stop test monitor cleanup to prevent further memory allocations
    if ((testMonitor as any).stopCleanup) {
      (testMonitor as any).stopCleanup();
    }
    
    server.close(() => {
      console.log('Server closed. Exiting process.');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors without crashing
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
})();
