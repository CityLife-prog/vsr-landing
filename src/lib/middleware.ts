// Security middleware for VSR Landing API endpoints
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit, validateEnvironment, secureLog } from './security';

/**
 * Security middleware wrapper for API endpoints
 * CRITICAL: Implements multiple layers of security protection
 */
export function withSecurity(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 1. Validate environment variables on startup
      const envValidation = validateEnvironment();
      if (!envValidation.isValid) {
        secureLog('error', 'Environment validation failed', { errors: envValidation.errors });
        return res.status(500).json({ 
          error: 'Server configuration error',
          details: process.env.NODE_ENV === 'development' ? envValidation.errors : undefined
        });
      }

      // 2. Add security headers
      addSecurityHeaders(res);

      // 3. Validate HTTP method (only POST allowed for form submissions)
      if (req.method !== 'POST') {
        secureLog('warn', 'Invalid HTTP method attempted', { method: req.method, ip: getClientIP(req) });
        return res.status(405).json({ 
          error: 'Method not allowed',
          allowed: ['POST']
        });
      }

      // 4. Rate limiting
      const clientIP = getClientIP(req);
      const rateLimitResult = checkRateLimit({ ip: clientIP, headers: req.headers });
      
      if (!rateLimitResult.allowed) {
        secureLog('warn', 'Rate limit exceeded', { ip: clientIP });
        return res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: rateLimitResult.resetTime ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) : 900
        });
      }

      // 5. Log secure request info
      secureLog('info', 'API request received', { 
        endpoint: req.url,
        method: req.method,
        userAgent: req.headers['user-agent']?.substring(0, 100), // Truncate user agent
        contentLength: req.headers['content-length']
      });

      // 6. Execute the actual handler
      await handler(req, res);

    } catch (error) {
      // 7. Handle unexpected errors securely
      secureLog('error', 'Unhandled API error', { 
        endpoint: req.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };
}

/**
 * Adds comprehensive security headers to responses
 * CRITICAL: Prevents XSS, clickjacking, and other client-side attacks
 */
function addSecurityHeaders(res: NextApiResponse) {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // CORS headers for API endpoints
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://vsrsnow.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Cache control for API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

/**
 * Safely extracts client IP address from request
 * CRITICAL: Handles various proxy configurations for accurate IP detection
 */
function getClientIP(req: NextApiRequest): string {
  // Try various headers in order of preference
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cloudflareIP = req.headers['cf-connecting-ip'];
  
  if (typeof cloudflareIP === 'string') {
    return cloudflareIP.split(',')[0].trim();
  }
  
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (typeof realIP === 'string') {
    return realIP;
  }
  
  // Fallback to connection remote address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Validates request content type for file uploads
 * CRITICAL: Ensures only multipart form data is accepted for file uploads
 */
export function validateContentType(req: NextApiRequest): boolean {
  const contentType = req.headers['content-type'];
  
  if (!contentType) {
    return false;
  }
  
  // Must be multipart/form-data for file uploads
  return contentType.startsWith('multipart/form-data');
}

/**
 * Request size validation middleware
 * CRITICAL: Prevents large payload DoS attacks
 */
export function validateRequestSize(req: NextApiRequest): { isValid: boolean; error?: string } {
  const contentLength = req.headers['content-length'];
  
  if (!contentLength) {
    return { isValid: false, error: 'Content-Length header required' };
  }
  
  const size = parseInt(contentLength, 10);
  const maxSize = 50 * 1024 * 1024; // 50MB max request size
  
  if (isNaN(size) || size <= 0) {
    return { isValid: false, error: 'Invalid Content-Length' };
  }
  
  if (size > maxSize) {
    return { isValid: false, error: `Request too large. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB` };
  }
  
  return { isValid: true };
}