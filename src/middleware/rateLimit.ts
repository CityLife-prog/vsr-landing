/**
 * Rate Limiting Middleware
 * Implements configurable rate limiting for API endpoints
 */

import { NextApiRequest, NextApiResponse } from 'next';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: NextApiRequest) => string; // Custom key generator
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>();

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - more restrictive
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.'
  },
  
  // Admin endpoints - moderate restrictions
  ADMIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Rate limit exceeded for admin operations.'
  },
  
  // General API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Rate limit exceeded. Please slow down.'
  },
  
  // Password reset - very restrictive
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per hour
    message: 'Too many password reset requests. Please try again later.'
  },
  
  // Email endpoints - restrictive
  EMAIL: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3, // 3 emails per 5 minutes
    message: 'Too many email requests. Please wait before sending another.'
  }
} as const;

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.connection.remoteAddress;
  return `rate_limit:${ip}:${req.url}`;
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupExpiredEntries();
    }

    const keyGenerator = config.keyGenerator || defaultKeyGenerator;
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(key, entry);
    }
    
    // Increment request count
    entry.count++;
    
    // Check if rate limit exceeded
    if (entry.count > config.maxRequests) {
      const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
      res.setHeader('Retry-After', resetInSeconds);
      
      // Log rate limit violation
      console.warn(`Rate limit exceeded for ${key}. Count: ${entry.count}, Max: ${config.maxRequests}`);
      
      return res.status(429).json({
        success: false,
        message: config.message || 'Rate limit exceeded',
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetInSeconds
      });
    }
    
    // Set rate limit headers for successful requests
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    
    // Continue to next middleware/handler
    next();
  };
}

/**
 * Higher-order function to wrap handlers with rate limiting
 */
export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  config: RateLimitConfig
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    return new Promise<void>((resolve, reject) => {
      const rateLimitMiddleware = rateLimit(config);
      
      rateLimitMiddleware(req, res, () => {
        try {
          const result = handler(req, res);
          if (result instanceof Promise) {
            result.then(resolve).catch(reject);
          } else {
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  };
}

/**
 * Predefined rate limit wrappers for common use cases
 */
export const withAuthRateLimit = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
  withRateLimit(handler, RATE_LIMIT_CONFIGS.AUTH);

export const withAdminRateLimit = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
  withRateLimit(handler, RATE_LIMIT_CONFIGS.ADMIN);

export const withApiRateLimit = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
  withRateLimit(handler, RATE_LIMIT_CONFIGS.API);

export const withPasswordResetRateLimit = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
  withRateLimit(handler, RATE_LIMIT_CONFIGS.PASSWORD_RESET);

export const withEmailRateLimit = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
  withRateLimit(handler, RATE_LIMIT_CONFIGS.EMAIL);

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(req: NextApiRequest, config: RateLimitConfig): {
  limit: number;
  remaining: number;
  resetTime: number;
  isLimited: boolean;
} {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const key = keyGenerator(req);
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      isLimited: false
    };
  }
  
  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
    isLimited: entry.count >= config.maxRequests
  };
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export function resetRateLimit(req: NextApiRequest, config: RateLimitConfig): boolean {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const key = keyGenerator(req);
  
  const deleted = rateLimitStore.delete(key);
  if (deleted) {
    console.log(`Rate limit reset for key: ${key}`);
  }
  
  return deleted;
}

/**
 * Get all active rate limit entries (admin function)
 */
export function getAllRateLimits(): Array<{
  key: string;
  count: number;
  resetTime: number;
  remainingMs: number;
}> {
  const now = Date.now();
  const results: Array<{
    key: string;
    count: number;
    resetTime: number;
    remainingMs: number;
  }> = [];
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now <= entry.resetTime) {
      results.push({
        key,
        count: entry.count,
        resetTime: entry.resetTime,
        remainingMs: entry.resetTime - now
      });
    }
  }
  
  return results.sort((a, b) => b.count - a.count);
}