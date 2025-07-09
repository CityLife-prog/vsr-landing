/**
 * Security Headers Configuration
 * Implements security best practices with HTTP headers
 */

import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'cors';

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In production, replace with your actual domains
    const allowedOrigins = [
      'http://localhost:3000',
      'https://yourdomain.com',
      'https://www.yourdomain.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Fingerprint',
    'X-Platform',
    'X-Browser'
  ],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};

// Initialize CORS middleware
const corsMiddleware = cors(corsOptions);

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(res: NextApiResponse): void {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://vercel.live; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), fullscreen=(self), payment=()'
  );

  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Expect-CT (Certificate Transparency)
  res.setHeader('Expect-CT', 'max-age=86400, enforce');

  // Remove server header
  res.removeHeader('X-Powered-By');

  // Custom security headers
  res.setHeader('X-Security-Headers', 'applied');
  res.setHeader('X-Request-ID', generateRequestId());
}

/**
 * Apply CORS headers
 */
export function applyCORS(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

/**
 * Security middleware wrapper
 */
export function withSecurityHeaders<T extends NextApiRequest>(
  handler: (req: T, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: T, res: NextApiResponse) => {
    try {
      // Apply CORS
      await applyCORS(req, res);
      
      // Apply security headers
      applySecurityHeaders(res);
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      // Call the actual handler
      await handler(req, res);
      
    } catch (error) {
      console.error('Security middleware error:', error);
      
      if (error instanceof Error && error.message === 'Not allowed by CORS') {
        res.status(403).json({
          error: true,
          message: 'CORS policy violation',
          code: 'CORS_ERROR'
        });
      } else {
        res.status(500).json({
          error: true,
          message: 'Security middleware error',
          code: 'SECURITY_ERROR'
        });
      }
    }
  };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextApiRequest) => string;
}

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  private requests = new Map<string, number[]>();

  isRateLimited(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get existing requests for this key
    let requests = this.requests.get(key) || [];
    
    // Filter out old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit is exceeded
    if (requests.length >= config.maxRequests) {
      return true;
    }
    
    // Add current request
    requests.push(now);
    this.requests.set(key, requests);
    
    return false;
  }

  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(timestamp => timestamp > now - oneHour);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Cleanup old rate limit entries every 10 minutes
setInterval(() => rateLimiter.cleanup(), 10 * 60 * 1000);

/**
 * Rate limiting middleware
 */
export function withRateLimit(config: RateLimitConfig) {
  return function<T extends NextApiRequest>(
    handler: (req: T, res: NextApiResponse) => Promise<void> | void
  ) {
    return async (req: T, res: NextApiResponse) => {
      const key = config.keyGenerator ? config.keyGenerator(req) : getClientIP(req);
      
      if (rateLimiter.isRateLimited(key, config)) {
        res.status(429).json({
          error: true,
          message: config.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: config.windowMs / 1000
        });
        return;
      }
      
      await handler(req, res);
    };
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Get client IP address
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  
  if (typeof realIP === 'string') {
    return realIP;
  }
  
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Content Security Policy nonce generator
 */
export function generateNonce(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Validate content type
 */
export function validateContentType(req: NextApiRequest, expectedTypes: string[]): boolean {
  const contentType = req.headers['content-type'];
  if (!contentType) {
    return false;
  }
  
  return expectedTypes.some(type => contentType.includes(type));
}

/**
 * Sanitize file upload
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Limit length
  return sanitized.substring(0, 255);
}

/**
 * Check for suspicious patterns in request
 */
export function detectSuspiciousPatterns(req: NextApiRequest): boolean {
  const suspiciousPatterns = [
    /(<script|<iframe|<object|<embed)/i,
    /(javascript:|data:|vbscript:)/i,
    /(union\s+select|select\s+\*\s+from)/i,
    /(\.\.|\/etc\/|\/var\/|\/usr\/)/i
  ];
  
  const requestData = JSON.stringify(req.body) + JSON.stringify(req.query);
  
  return suspiciousPatterns.some(pattern => pattern.test(requestData));
}

export default {
  applySecurityHeaders,
  applyCORS,
  withSecurityHeaders,
  withRateLimit,
  generateNonce,
  validateContentType,
  sanitizeFileName,
  detectSuspiciousPatterns
};