/**
 * Error logging service for PeacePad
 * Captures errors locally for debugging during beta testing
 */

export interface LoggedError {
  id: string;
  timestamp: number;
  type: 'react' | 'api' | 'network' | 'unknown';
  message: string;
  stack?: string;
  url?: string;
  userId?: string;
  partnershipId?: string;
  context?: Record<string, any>;
}

const ERROR_STORAGE_KEY = 'peacepad_error_logs';
const MAX_ERRORS = 100;

class ErrorLogger {
  private errors: LoggedError[] = [];

  constructor() {
    this.loadErrors();
  }

  private loadErrors() {
    try {
      const stored = localStorage.getItem(ERROR_STORAGE_KEY);
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load error logs:', e);
    }
  }

  private saveErrors() {
    try {
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(this.errors));
    } catch (e) {
      console.error('Failed to save error logs:', e);
    }
  }

  log(error: Omit<LoggedError, 'id' | 'timestamp'>) {
    const loggedError: LoggedError = {
      ...error,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.errors.unshift(loggedError);
    
    if (this.errors.length > MAX_ERRORS) {
      this.errors = this.errors.slice(0, MAX_ERRORS);
    }

    this.saveErrors();
    
    console.error('[ErrorLogger]', loggedError);
    
    // Send to backend test monitor for aggregated monitoring
    this.sendToBackend(loggedError);
  }

  private sendToBackend(error: LoggedError) {
    // Don't block the main thread - fire and forget
    // Determine priority based on error type
    const priority = error.type === 'react' ? 'P1' : 'P2';
    
    fetch('/api/test-monitor/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: error.context?.componentStack,
        priority,
        type: error.type,
        url: error.url,
        userId: error.userId,
        partnershipId: error.partnershipId,
        context: error.context,
      }),
    }).catch(err => {
      // Silently fail - don't create infinite loop if backend is down
      console.warn('[ErrorLogger] Failed to send error to backend:', err);
    });
  }

  getErrors(): LoggedError[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
    this.saveErrors();
  }

  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }
}

export const errorLogger = new ErrorLogger();

export function logApiError(
  error: Error,
  endpoint: string,
  userId?: string,
  partnershipId?: string
) {
  errorLogger.log({
    type: 'api',
    message: error.message,
    stack: error.stack,
    url: endpoint,
    userId,
    partnershipId,
    context: {
      endpoint,
      userAgent: navigator.userAgent,
    },
  });
}

export function logNetworkError(error: Error, url?: string) {
  // Get user context
  const userContext = getCurrentUserContext();
  
  errorLogger.log({
    type: 'network',
    message: error.message,
    stack: error.stack,
    url: url || window.location.href,
    userId: userContext.userId,
    partnershipId: userContext.partnershipId,
    context: {
      online: navigator.onLine,
      userAgent: navigator.userAgent,
    },
  });
}

// Get current user context for error logging (exported for use in queryClient)
export function getCurrentUserContext() {
  try {
    const userDataStr = localStorage.getItem("peacepad_user");
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      return {
        userId: userData.id,
        partnershipId: localStorage.getItem("peacepad_current_partnership") || undefined,
      };
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return { userId: undefined, partnershipId: undefined };
}

// Global error handlers for uncaught errors
if (typeof window !== 'undefined') {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    const userContext = getCurrentUserContext();
    
    errorLogger.log({
      type: 'unknown',
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userId: userContext.userId,
      partnershipId: userContext.partnershipId,
      context: {
        reason: event.reason,
        userAgent: navigator.userAgent,
      },
    });
    console.error('[Global Promise Rejection]', event.reason);
  });

  // Global window errors
  window.addEventListener('error', (event) => {
    const userContext = getCurrentUserContext();
    errorLogger.log({
      type: 'unknown',
      message: event.message,
      url: window.location.href,
      userId: userContext.userId,
      partnershipId: userContext.partnershipId,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        userAgent: navigator.userAgent,
      },
    });
    console.error('[Global Window Error]', event.error);
  });

  // Network status monitoring
  window.addEventListener('offline', () => {
    const userContext = getCurrentUserContext();
    
    errorLogger.log({
      type: 'network',
      message: 'Device went offline',
      url: window.location.href,
      userId: userContext.userId,
      partnershipId: userContext.partnershipId,
      context: {
        online: false,
        userAgent: navigator.userAgent,
      },
    });
  });
}

export function logReactError(
  error: Error,
  errorInfo?: { componentStack?: string }
) {
  const userContext = getCurrentUserContext();
  
  errorLogger.log({
    type: 'react',
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userId: userContext.userId,
    partnershipId: userContext.partnershipId,
    context: {
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
    },
  });
}
