import { type Request, type Response } from "express";
import { sendP1ErrorAlert } from "./email";

/**
 * TestMonitor - Development & Beta Testing Monitoring System
 * 
 * Cost Optimization:
 * - By default, only logs P1 (critical) and P2 (important) errors
 * - Skips verbose API tracking, WebSocket connections, and user actions
 * - Set VERBOSE_MONITORING=true in .env to enable full logging for debugging
 * 
 * This reduces compute overhead and saves costs during development
 */

interface LogEntry {
  timestamp: string;
  priority: 'P1' | 'P2' | 'P3' | 'INFO';
  category: 'API' | 'WebSocket' | 'Database' | 'Auth' | 'UI' | 'Performance' | 'UserAction' | 'UnexpectedAction';
  message: string;
  details?: any;
  stack?: string;
}

class TestMonitor {
  private logs: LogEntry[] = [];
  private startTime: number = Date.now();
  private apiCalls: Map<string, number[]> = new Map();
  private wsConnections: Set<string> = new Set();
  private activeUsers: Set<string> = new Set(); // Track unique active users
  private userLastActivity: Map<string, number> = new Map(); // Track last activity timestamp
  private errors: LogEntry[] = [];
  private interactions: any[] = [];
  private userFlow: string[] = [];
  private performanceMetrics: any[] = [];
  private userActions: any[] = [];
  private verboseMode: boolean = process.env.VERBOSE_MONITORING === 'true';
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_LOGS = 100; // Keep only recent logs to save memory
  private readonly MAX_ERRORS = 50;
  private readonly MAX_METRICS = 50;
  private readonly MAX_API_CALLS_PER_ENDPOINT = 20;

  constructor() {
    // Start cleanup interval to prevent memory leaks
    this.startMemoryCleanup();
  }

  private startMemoryCleanup() {
    // Clear old entries every 5 minutes to prevent unbounded memory growth
    this.cleanupInterval = setInterval(() => {
      this.pruneOldEntries();
    }, 5 * 60 * 1000);
  }

  private pruneOldEntries() {
    // Keep only the most recent entries to prevent memory bloat
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }
    if (this.performanceMetrics.length > this.MAX_METRICS) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS);
    }
    if (this.userActions.length > this.MAX_METRICS) {
      this.userActions = this.userActions.slice(-this.MAX_METRICS);
    }
    if (this.interactions.length > this.MAX_METRICS) {
      this.interactions = this.interactions.slice(-this.MAX_METRICS);
    }
    if (this.userFlow.length > this.MAX_METRICS) {
      this.userFlow = this.userFlow.slice(-this.MAX_METRICS);
    }

    // Trim API call history for each endpoint
    for (const [endpoint, durations] of Array.from(this.apiCalls.entries())) {
      if (durations.length > this.MAX_API_CALLS_PER_ENDPOINT) {
        this.apiCalls.set(endpoint, durations.slice(-this.MAX_API_CALLS_PER_ENDPOINT));
      }
    }
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  log(priority: 'P1' | 'P2' | 'P3' | 'INFO', category: LogEntry['category'], message: string, details?: any, stack?: string) {
    // In non-verbose mode, only log P1 and P2 errors to reduce overhead
    if (!this.verboseMode && priority !== 'P1' && priority !== 'P2') {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      priority,
      category,
      message,
      details,
      stack
    };
    
    this.logs.push(entry);
    
    if (priority === 'P1' || priority === 'P2') {
      this.errors.push(entry);
    }

    // Console output with color coding
    const color = priority === 'P1' ? '\x1b[31m' : priority === 'P2' ? '\x1b[33m' : priority === 'P3' ? '\x1b[36m' : '\x1b[37m';
    const reset = '\x1b[0m';
    
    // Only log P1/P2 messages to console in non-verbose mode
    if (priority === 'P1' || priority === 'P2') {
      console.log(`${color}[${priority}] [${category}]${reset} ${message}`);
      if (details) console.log('  Details:', JSON.stringify(details, null, 2));
    } else if (this.verboseMode && priority !== 'INFO') {
      console.log(`${color}[${priority}] [${category}]${reset} ${message}`);
    }

    // Send email alert for P1 errors (critical errors requiring immediate attention)
    if (priority === 'P1') {
      sendP1ErrorAlert(message, details, stack, category)
        .then(success => {
          if (success) {
            console.log('[TestMonitor] P1 error alert email sent successfully');
          } else {
            console.warn('[TestMonitor] P1 error alert email failed to send (Mailjet keys may not be configured)');
          }
        })
        .catch(err => {
          console.error('[TestMonitor] Failed to send P1 error alert email:', err);
        });
    }
  }

  // Track active user from API call (lightweight - always enabled)
  trackActiveUser(userId: string) {
    if (!userId) return;
    
    const now = Date.now();
    const wasNew = !this.activeUsers.has(userId);
    
    this.activeUsers.add(userId);
    this.userLastActivity.set(userId, now);
    
    // Only log in verbose mode
    if (wasNew && this.verboseMode) {
      this.log('INFO', 'UserAction', `New active user: ${userId}`);
    }
    
    // Clean up inactive users (no activity for 5 minutes)
    const INACTIVE_THRESHOLD = 5 * 60 * 1000;
    for (const [user, lastActivity] of Array.from(this.userLastActivity.entries())) {
      if (now - lastActivity > INACTIVE_THRESHOLD) {
        this.activeUsers.delete(user);
        this.userLastActivity.delete(user);
      }
    }
  }

  // Log user actions (only in verbose mode)
  logUserAction(userId: string, action: string, details?: any) {
    if (!this.verboseMode) {
      return; // Skip user action logging in non-verbose mode
    }

    const entry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details
    };
    
    this.userActions.push(entry);
    this.log('INFO', 'UserAction', `User ${userId} ${action}`, details);
  }

  // Log unexpected actions
  logUnexpectedAction(userId: string, action: string, details?: any) {
    this.log('P2', 'UnexpectedAction', `Unexpected action from user ${userId}: ${action}`, details);
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, details?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      metric,
      value,
      details
    };
    
    this.performanceMetrics.push(entry);
    
    // Only log slow page loads here (API calls are logged in trackAPICall to avoid duplication)
    if (metric === 'page_load' && value > 3000) {
      this.log('P2', 'Performance', `Slow page load: ${value}ms`, details);
    }
  }

  trackAPICall(endpoint: string, duration: number, status: number) {
    // Only track stats in verbose mode to reduce memory overhead
    if (this.verboseMode) {
      if (!this.apiCalls.has(endpoint)) {
        this.apiCalls.set(endpoint, []);
      }
      this.apiCalls.get(endpoint)!.push(duration);
    }

    // 🚀 PERFORMANCE: Ignore cold start for /api/version (Vite build on first request)
    // /api/version is expected to be slow on very first call due to Vite cold start
    const isVersionEndpoint = endpoint === '/api/version';
    const isColdStart = !this.apiCalls.has(endpoint) || this.apiCalls.get(endpoint)!.length === 0;
    
    // Skip P1 alert for version endpoint cold start (expected behavior)
    if (isVersionEndpoint && isColdStart && duration > 2000) {
      // Log but don't trigger P1 email alert
      console.log(`[Performance] First /api/version call took ${duration}ms (cold start - expected)`);
      return;
    }

    // Always log errors and very slow calls (P1/P2 only)
    if (duration > 2000) {
      this.log('P1', 'Performance', `Very slow API call: ${endpoint} took ${duration}ms`, { status, duration });
    } else if (duration > 1000) {
      this.log('P2', 'Performance', `Slow API call: ${endpoint} took ${duration}ms`, { status, duration });
    }

    // Error status check
    if (status >= 500) {
      this.log('P1', 'API', `Server error on ${endpoint}`, { status, duration });
    } else if (status >= 400 && status !== 404) {
      this.log('P2', 'API', `Client error on ${endpoint}`, { status, duration });
    }
  }

  trackWSConnection(userId: string, action: 'connect' | 'disconnect' | 'error') {
    if (action === 'connect') {
      this.wsConnections.add(userId);
      // Only log connections in verbose mode (P3 is filtered out in non-verbose)
      if (this.verboseMode) {
        this.log('P3', 'WebSocket', `User ${userId} connected`);
      }
    } else if (action === 'disconnect') {
      this.wsConnections.delete(userId);
      // Only log disconnections in verbose mode
      if (this.verboseMode) {
        this.log('P3', 'WebSocket', `User ${userId} disconnected`);
      }
    } else if (action === 'error') {
      // Always log errors
      this.log('P1', 'WebSocket', `WebSocket error for user ${userId}`);
    }
  }

  trackDatabaseQuery(query: string, duration: number, error?: Error) {
    if (error) {
      this.log('P1', 'Database', `Database query failed: ${query}`, { error: error.message }, error.stack);
    } else if (duration > 500) {
      this.log('P2', 'Database', `Slow database query (${duration}ms): ${query.substring(0, 100)}...`);
    }
  }

  getSummary() {
    const runtime = Math.floor((Date.now() - this.startTime) / 1000);
    const p1Count = this.logs.filter(l => l.priority === 'P1').length;
    const p2Count = this.logs.filter(l => l.priority === 'P2').length;
    const p3Count = this.logs.filter(l => l.priority === 'P3').length;
    
    // Categorize logs by type
    const errorCount = this.errors.length;
    const performanceCount = this.logs.filter(l => l.category === 'Performance').length;
    const userActionCount = this.userActions.length;
    const unexpectedActionCount = this.logs.filter(l => l.category === 'UnexpectedAction').length;

    // API performance analysis
    const apiStats = Array.from(this.apiCalls.entries()).map(([endpoint, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      return { endpoint, avg: Math.round(avg), max, min, count: durations.length };
    });
    
    // Performance metrics summary
    const avgPerformance = this.performanceMetrics.length > 0
      ? Math.round(this.performanceMetrics.reduce((sum, m) => sum + m.value, 0) / this.performanceMetrics.length)
      : 0;

    return {
      runtime: `${runtime}s`,
      activeUsers: this.activeUsers.size, // Track active users, not just WS connections
      activeWSConnections: this.wsConnections.size,
      totalLogs: this.logs.length,
      categories: {
        errors: errorCount,
        performance: performanceCount,
        userActions: userActionCount,
        unexpectedActions: unexpectedActionCount
      },
      issues: {
        P1: p1Count,
        P2: p2Count,
        P3: p3Count
      },
      apiStats,
      performanceMetrics: {
        average: avgPerformance,
        recent: this.performanceMetrics.slice(-10)
      },
      recentErrors: this.errors.slice(-10),
      recentUserActions: this.userActions.slice(-5)
    };
  }

  reset() {
    this.logs = [];
    this.startTime = Date.now();
    this.apiCalls.clear();
    this.activeUsers.clear();
    this.userLastActivity.clear();
    this.errors = [];
    this.performanceMetrics = [];
    this.userActions = [];
    this.wsConnections.clear();
  }

  getAllLogs() {
    return this.logs;
  }

  trackInteraction(data: any) {
    // Only track detailed interactions in verbose mode
    if (!this.verboseMode) {
      return;
    }

    this.interactions.push({
      ...data,
      timestamp: new Date().toISOString()
    });
    
    // Track user flow
    if (data.type === 'navigation') {
      this.userFlow.push(data.url);
      
      // Detect potential navigation issues (P2 is always logged)
      const lastTen = this.userFlow.slice(-10);
      if (lastTen.filter(u => u === data.url).length > 3) {
        this.log('P2', 'UI', 'User seems stuck in navigation loop', { url: data.url });
      }
    }
  }

  getInteractions() {
    return this.interactions;
  }

  getUserFlow() {
    return this.userFlow;
  }

  analyzeIssues() {
    const p1Issues = this.errors.filter(e => e.priority === 'P1');
    const p2Issues = this.errors.filter(e => e.priority === 'P2');
    
    const categorized = {
      blocking: p1Issues.filter(i => 
        i.message.includes('API') || 
        i.message.includes('Database') ||
        i.message.includes('WebSocket')
      ),
      ux: p2Issues.filter(i => 
        i.category === 'UI' || 
        i.message.includes('slow')
      ),
      mobile: this.interactions.filter((i: any) => 
        i.type === 'touch' && i.touches > 1
      ).length > 0 ? ['Multi-touch detected - verify gestures work'] : []
    };
    
    return categorized;
  }
}

export const testMonitor = new TestMonitor();

// Log monitoring mode on startup
const mode = process.env.VERBOSE_MONITORING === 'true' ? 'VERBOSE' : 'OPTIMIZED';
console.log(`[TestMonitor] Running in ${mode} mode (P1/P2 errors only${mode === 'VERBOSE' ? ' + full tracking' : ''})`);
