/**
 * CORS Middleware Configuration
 * Configures Cross-Origin Resource Sharing for API endpoints
 */

import { NextApiRequest, NextApiResponse } from 'next';

export interface CorsOptions {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge?: number;
}

const PRODUCTION_ORIGINS = [
  'https://vsrsnow.com',
  'https://www.vsrsnow.com',
  'https://vsr-construction.vercel.app'
];

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000'
];

export function getCorsOptions(): CorsOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    origin: isProduction ? PRODUCTION_ORIGINS : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  };
}

export function corsMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: Partial<CorsOptions>
): boolean {
  const corsOptions = { ...getCorsOptions(), ...options };
  const origin = req.headers.origin;

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false; // Don't continue processing
  }

  // Set CORS headers
  if (corsOptions.origin === true) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (corsOptions.origin === false) {
    // No CORS
  } else if (typeof corsOptions.origin === 'string') {
    res.setHeader('Access-Control-Allow-Origin', corsOptions.origin);
  } else if (Array.isArray(corsOptions.origin)) {
    if (origin && corsOptions.origin.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
  
  if (corsOptions.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (corsOptions.maxAge) {
    res.setHeader('Access-Control-Max-Age', corsOptions.maxAge.toString());
  }

  // Log CORS info in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`CORS: ${req.method} ${req.url} from origin: ${origin || 'none'}`);
  }

  return true; // Continue processing
}

export function withCors(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options?: Partial<CorsOptions>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const shouldContinue = corsMiddleware(req, res, options);
    
    if (shouldContinue) {
      return handler(req, res);
    }
  };
}

// Security headers middleware
export function securityHeaders(req: NextApiRequest, res: NextApiResponse): void {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.emailjs.com",
    "frame-src https://www.google.com https://maps.google.com"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
}

export function withSecurityHeaders(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    securityHeaders(req, res);
    return handler(req, res);
  };
}

// Combined middleware
export function withSecurity(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  corsOptions?: Partial<CorsOptions>
) {
  return withSecurityHeaders(withCors(handler, corsOptions));
}