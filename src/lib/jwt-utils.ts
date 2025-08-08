/**
 * JWT Utilities
 * Secure JWT token handling with proper error handling
 */

import jwt from 'jsonwebtoken';

/**
 * Get JWT secret with proper error handling
 * @throws {Error} If JWT_SECRET is not configured
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

/**
 * Sign JWT token with security checks
 */
export function signJwtToken(payload: any, options?: jwt.SignOptions): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    expiresIn: '24h',
    ...options
  });
}

/**
 * Verify JWT token with security checks
 */
export function verifyJwtToken(token: string): any {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}

/**
 * Safe JWT verification for API endpoints
 * Returns null instead of throwing for invalid tokens
 */
export function safeVerifyJwtToken(token: string): any | null {
  try {
    return verifyJwtToken(token);
  } catch (error) {
    return null;
  }
}