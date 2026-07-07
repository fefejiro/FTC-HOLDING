import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedInitialData } from "./seed-data";
import cors, { type CorsOptions } from "cors";
import { resolveDeploymentRole, shouldServeFrontend } from "./lib/deploymentMode";

const app = express();
const httpServer = createServer(app);
const deploymentRole = resolveDeploymentRole({
  nodeEnv: process.env.NODE_ENV || "development",
  explicitRole: process.env.DEPLOY_ROLE,
  publicBaseUrl:
    process.env.PUBLIC_BASE_URL ||
    process.env.APP_ORIGIN ||
    process.env.VITE_API_BASE_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN,
  railwayEnvPresent: Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.RAILWAY_STATIC_URL,
  ),
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const allowedOrigins = new Set([
  "https://localhost",
  "http://localhost",
  "http://127.0.0.1",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "capacitor://localhost",
  "ionic://localhost",
  "https://saywetin.app",
  "https://www.saywetin.app",
  "https://saywetin.pages.dev",
]);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    return host === "saywetin.pages.dev" || host.endsWith(".saywetin.pages.dev");
  } catch {
    return false;
  }
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.warn(`[CORS] Origin not allowed: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.set("trust proxy", 1);

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Health check endpoints - must respond quickly for deployment health checks
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Lightweight internal health alias used by some local tools.
app.get("/__health", (_req, res) => {
  res.status(200).send("OK");
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function defaultApiErrorCode(status: number): string {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "API_NOT_FOUND";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 415) return "UNSUPPORTED_MEDIA_TYPE";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  return "INTERNAL_SERVER_ERROR";
}

function normalizeApiError(err: any): { status: number; code: string; message: string; details?: unknown } {
  let status = Number(err?.status || err?.statusCode || 500);
  if (!Number.isFinite(status) || status < 400 || status > 599) {
    status = 500;
  }

  let code = typeof err?.code === "string" ? err.code : defaultApiErrorCode(status);
  let message = typeof err?.message === "string" && err.message.trim().length > 0
    ? err.message.trim()
    : "Internal Server Error";

  if (err?.name === "MulterError") {
    if (err?.code === "LIMIT_FILE_SIZE") {
      status = 413;
      code = "PAYLOAD_TOO_LARGE";
      message = "Audio upload exceeds the 10MB limit.";
    } else {
      status = 400;
      code = "UPLOAD_ERROR";
      message = "Audio upload failed.";
    }
  }

  if (typeof err?.message === "string" && err.message.toLowerCase().includes("invalid file type")) {
    status = 415;
    code = "UNSUPPORTED_MEDIA_TYPE";
    message = "Invalid file type. Only audio files are allowed.";
  }

  const details =
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          name: err?.name || "Error",
          rawCode: err?.code,
        };

  return { status, code, message, details };
}

function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const payload: ApiErrorEnvelope = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };

  res.status(status).json(payload);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use("/api", (_req, res) => {
    sendApiError(res, 404, "API_NOT_FOUND", "API route not found.");
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      const normalized = normalizeApiError(err);
      sendApiError(res, normalized.status, normalized.code, normalized.message, normalized.details);
      return;
    }

    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    if (shouldServeFrontend(deploymentRole)) {
      serveStatic(app);
    } else {
      console.log(`[Deploy] SayWetin API-only mode enabled (role=${deploymentRole}).`);
      app.use("*", (req, res) => {
        if (
          req.path.startsWith("/api/") ||
          req.path === "/api" ||
          req.path === "/health" ||
          req.path === "/api/health" ||
          req.path === "/__health"
        ) {
          sendApiError(res, 404, "API_NOT_FOUND", "API route not found.");
          return;
        }

        res.status(404).json({
          message: "This host only serves the SayWetin API. Use https://saywetin.app for the web app.",
        });
      });
    }
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      ...(process.platform === "win32" ? {} : { reusePort: true }),
    },
    () => {
      log(`serving on port ${port}`);
      console.log(`[Deploy] SayWetin deployment role: ${deploymentRole}`);
      
      // Seed initial data after server is listening (non-blocking for health checks)
      seedInitialData().catch(err => console.error('Seed failed:', err));
    },
  );
})();

