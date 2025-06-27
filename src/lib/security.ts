// Security utilities for VSR Landing API
import crypto from 'crypto';

// File upload security configuration
export const SECURITY_CONFIG = {
  // Allowed file types for different upload contexts
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  
  // File size limits (in bytes)
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB - reduced from 10MB
  MAX_TOTAL_UPLOAD_SIZE: 25 * 1024 * 1024, // 25MB total
  
  // File name restrictions
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'],
  BLOCKED_EXTENSIONS: ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar', '.js', '.php', '.asp', '.jsp'],
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 5, // 5 requests per window per IP
  
  // Input validation limits
  MAX_TEXT_LENGTH: 2000,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254, // RFC 5321 limit
} as const;

/**
 * Validates file uploads against security policies
 * CRITICAL: Prevents malicious file uploads that could compromise the server
 */
export function validateFileUpload(file: { originalFilename?: string | null; mimetype?: string | null; size?: number; filepath?: string }): { isValid: boolean; error?: string } {
  // Check if file exists
  if (!file || !file.originalFilename || !file.mimetype) {
    return { isValid: false, error: 'Invalid file data' };
  }

  // Check file size
  if (file.size && file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File too large. Maximum size: ${Math.round(SECURITY_CONFIG.MAX_FILE_SIZE / 1024 / 1024)}MB` 
    };
  }

  // Check MIME type
  const allowedTypes: string[] = [
    ...SECURITY_CONFIG.ALLOWED_IMAGE_TYPES,
    ...SECURITY_CONFIG.ALLOWED_DOCUMENT_TYPES
  ];
  
  if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
    return { 
      isValid: false, 
      error: `File type not allowed: ${file.mimetype}` 
    };
  }

  // Check file extension
  const filename = file.originalFilename.toLowerCase();
  const hasAllowedExtension = SECURITY_CONFIG.ALLOWED_EXTENSIONS.some(ext => 
    filename.endsWith(ext)
  );
  
  if (!hasAllowedExtension) {
    return { 
      isValid: false, 
      error: 'File extension not allowed' 
    };
  }

  // Check for blocked extensions (double extension attacks)
  const hasBlockedExtension = SECURITY_CONFIG.BLOCKED_EXTENSIONS.some(ext => 
    filename.includes(ext)
  );
  
  if (hasBlockedExtension) {
    return { 
      isValid: false, 
      error: 'File contains blocked extension' 
    };
  }

  // Check filename for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { 
      isValid: false, 
      error: 'Invalid filename' 
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes text input to prevent injection attacks
 * CRITICAL: Prevents XSS, email injection, and other text-based attacks
 */
export function sanitizeText(input: string | undefined): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with spaces to prevent email header injection
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, SECURITY_CONFIG.MAX_TEXT_LENGTH); // Prevent excessively long input
}

/**
 * Validates email format using RFC-compliant regex
 * CRITICAL: Prevents email injection and ensures valid email format
 */
export function validateEmail(email: string | undefined): { isValid: boolean; sanitized: string } {
  if (!email) {
    return { isValid: false, sanitized: '' };
  }

  const sanitized = email.trim().toLowerCase();
  
  // RFC 5322 compliant email regex (simplified but secure)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(sanitized) || sanitized.length > SECURITY_CONFIG.MAX_EMAIL_LENGTH) {
    return { isValid: false, sanitized: '' };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates phone number format
 * CRITICAL: Ensures consistent phone number format and prevents injection
 */
export function validatePhone(phone: string | undefined): { isValid: boolean; sanitized: string } {
  if (!phone) {
    return { isValid: false, sanitized: '' };
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 digits)
  if (digits.length !== 10) {
    return { isValid: false, sanitized: '' };
  }

  // Format as (XXX) XXX-XXXX
  const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  
  return { isValid: true, sanitized: formatted };
}

/**
 * Generates secure filename to prevent path traversal and collisions
 * CRITICAL: Prevents file system attacks and ensures unique file names
 */
export function generateSecureFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  
  // Get file extension safely
  const extension = originalFilename.split('.').pop()?.toLowerCase() || '';
  const extensionWithDot = `.${extension}`;
  const safeExtension = SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extensionWithDot as '.jpg' | '.jpeg' | '.png' | '.gif' | '.webp' | '.pdf' | '.doc' | '.docx') 
    ? extensionWithDot 
    : '.unknown';
  
  return `upload_${timestamp}_${randomBytes}${safeExtension}`;
}

/**
 * Validates environment variables for security
 * CRITICAL: Ensures all required security configurations are present
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.EMAIL_FROM) {
    errors.push('EMAIL_FROM environment variable is required');
  }
  
  if (!process.env.EMAIL_PASS) {
    errors.push('EMAIL_PASS environment variable is required');
  }
  
  // Validate email format
  if (process.env.EMAIL_FROM) {
    const { isValid } = validateEmail(process.env.EMAIL_FROM);
    if (!isValid) {
      errors.push('EMAIL_FROM must be a valid email address');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Rate limiting store (in-memory for simplicity, use Redis in production)
 * CRITICAL: Prevents DoS attacks and abuse
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(req: any): { 
  allowed: boolean; 
  resetTime?: number;
  ip: string;
  totalRequests: number;
  windowMs: number;
  timeUntilReset: number;
} {
  // Extract IP address from request
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor) 
    ? forwardedFor[0] 
    : forwardedFor?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  const now = Date.now();
  const key = `rate_limit_${ip}`;
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    // Create new window
    const resetTime = now + SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { 
      allowed: true,
      ip,
      totalRequests: 1,
      windowMs: SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS,
      timeUntilReset: resetTime - now
    };
  }
  
  const timeUntilReset = existing.resetTime - now;
  
  if (existing.count >= SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      resetTime: existing.resetTime,
      ip,
      totalRequests: existing.count,
      windowMs: SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS,
      timeUntilReset
    };
  }
  
  // Increment count
  existing.count++;
  rateLimitStore.set(key, existing);
  
  return { 
    allowed: true,
    ip,
    totalRequests: existing.count,
    windowMs: SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS,
    timeUntilReset
  };
}

/**
 * Secure logging function that removes sensitive data
 * CRITICAL: Prevents sensitive data exposure in logs
 */
export function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  
  // Remove sensitive fields from data if present
  if (data && typeof data === 'object') {
    const safeDdata = { ...data };
    delete safeDdata.password;
    delete safeDdata.email;
    delete safeDdata.phone;
    delete safeDdata.auth;
    delete safeDdata.credentials;
    
    console[level](`[${timestamp}] ${message}`, safeDdata);
  } else {
    console[level](`[${timestamp}] ${message}`);
  }
}