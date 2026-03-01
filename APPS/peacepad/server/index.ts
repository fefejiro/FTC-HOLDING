import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testMonitor } from "./testMonitor";
import { startConchSessionCleanup } from "./conchSessionCleanup";
import { startCallCleanup } from "./callCleanup";
import { initializeWeeklyReportScheduler } from "./weeklyReport";
import { setupSoftAuth } from "./softAuth";
import { killProcessOnPort, HealthMonitor, setupAutoCleanup } from "./autoRecovery";
import path from "path";

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

// CRITICAL: Health check endpoints MUST be first (before any middleware)
// Replit autoscale requires fast health responses for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Enable CORS with credentials for authentication
// Production: allow peacepad.ca and Replit deployment domains
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://peacepad.ca', 
      'https://www.peacepad.ca',
      'https://saywetin.app',
      'https://www.saywetin.app',
      'https://peace-pad.replit.app',
      'https://Peace-Pad.replit.app',
      // Capacitor native app origins (Android/iOS)
      'capacitor://localhost',
      'http://localhost',
      'http://127.0.0.1',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      // Include any custom domain from environment
      ...(process.env.CUSTOM_DOMAINS ? process.env.CUSTOM_DOMAINS.split(',').map(d => d.trim()) : [])
    ].filter(Boolean)
  : true; // Allow all origins in development

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.set("trust proxy", 1); // Replit proxy fix

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Override external CSP with WebRTC-compatible policy
app.use((req, res, next) => {
  // Allow Replit iframe preview in development
  const frameAncestors = process.env.NODE_ENV === 'production'
    ? "'self' https://peacepad.ca https://www.peacepad.ca"
    : "'self' https://*.replit.dev https://*.replit.app https://replit.com";
  
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self' blob: data:;",
      "connect-src 'self' wss: https:;",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://replit.com https://*.firebaseio.com;",
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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

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
      
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "...";
      }

      log(logLine);
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
    // Enable CORS for audio files
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

(async () => {
  // Setup guest authentication (must be before registerRoutes)
  await setupSoftAuth(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(status).json({ message });
    }

    // Log the error but don't throw it (prevents double-sending headers)
    if (status >= 500) {
      console.error('Server error:', err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // SMART AUTO-RECOVERY: Clear port before starting
  console.log('[Auto-Recovery] Initializing smart startup sequence...');
  await killProcessOnPort(port);
  
  // Helper function to start server with retry on EADDRINUSE
  const startServer = (retryCount = 0, maxRetries = 3): Promise<void> => {
    return new Promise((resolve, reject) => {
      const serverInstance = server.listen({
        port,
        host: "0.0.0.0",
        ...(process.platform === "win32" ? {} : { reusePort: true }),
      }, () => {
        log(`serving on port ${port}`);
        console.log('[Auto-Recovery] Server started successfully');

        // Suppress the verbose Replit ASCII art in console
        if (process.env.NODE_ENV === 'production') {
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

  // Initialize weekly report scheduler (sends reports every Monday at 9:00 AM)
  initializeWeeklyReportScheduler();

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
