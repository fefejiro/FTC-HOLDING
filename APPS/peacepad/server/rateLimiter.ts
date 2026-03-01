import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;  // Error message
  keyGenerator?: (req: Request) => string;  // How to identify clients
}

// Store for tracking requests
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  requestCounts.forEach((value, key) => {
    if (value.resetTime < now) {
      requestCounts.delete(key);
    }
  });
}, 60000);

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => {
      // Default: use user ID if authenticated, otherwise IP
      const userId = (req as any).user?.id;
      return userId || req.ip || 'unknown';
    }
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    const record = requestCounts.get(key);
    
    if (!record || record.resetTime < now) {
      // New window
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (record.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.floor(record.resetTime / 1000)));
      return res.status(429).json({ 
        error: message,
        retryAfter,
        limit: maxRequests,
        remaining: 0,
        resetTime: record.resetTime
      });
    }
    
    // Increment count and add rate limit headers
    record.count++;
    const remaining = maxRequests - record.count;
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(Math.floor(record.resetTime / 1000)));
    next();
  };
}

// Preset rate limiters for different use cases
export const rateLimiters = {
  // Strict: For sensitive operations (5 requests per minute)
  strict: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: 'Too many attempts, please wait before trying again'
  }),
  
  // Standard: For regular API endpoints (30 requests per minute)
  standard: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30
  }),
  
  // Relaxed: For read operations (100 requests per minute)
  relaxed: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100
  }),
  
  // Messages: Prevent spam (20 messages per minute)
  messages: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'You are sending messages too quickly. Please slow down.'
  }),
  
  // File uploads: Limit receipt/image uploads (10 per 5 minutes)
  uploads: createRateLimiter({
    windowMs: 5 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many file uploads. Please wait before uploading more files.'
  }),
  
  // Expensive operations: AI analysis, reports (10 per hour)
  expensive: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    message: 'This operation is resource-intensive. Please wait before trying again.'
  }),
  
  // AI analysis: For message analysis and conflict detection (30 per minute per user)
  aiAnalysis: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Too many AI analysis requests. Please slow down.'
  })
};