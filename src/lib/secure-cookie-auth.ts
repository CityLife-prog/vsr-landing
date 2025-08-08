/**
 * Secure Cookie-Based Authentication
 * Implements HTTP-only cookie authentication to prevent XSS attacks
 * SECURITY: Replaces client-side JWT storage with secure server-side cookies
 */

import { serialize, parse } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingMessage, ServerResponse } from 'http';
import * as crypto from 'crypto';

// Cookie configuration
export const COOKIE_CONFIG = {
  // Cookie names
  ACCESS_TOKEN: 'vsr_access_token',
  REFRESH_TOKEN: 'vsr_refresh_token',
  SESSION_ID: 'vsr_session_id',
  CSRF_TOKEN: 'vsr_csrf_token',
  
  // Security settings
  HTTP_ONLY: true,
  SECURE: process.env.NODE_ENV === 'production',
  SAME_SITE: 'strict' as const,
  
  // Expiration times (in seconds)
  ACCESS_TOKEN_TTL: 15 * 60, // 15 minutes
  REFRESH_TOKEN_TTL: 7 * 24 * 60 * 60, // 7 days
  SESSION_TTL: 24 * 60 * 60, // 24 hours
  
  // Path settings
  PATH: '/',
  DOMAIN: process.env.COOKIE_DOMAIN || undefined,
} as const;

/**
 * Cookie authentication result
 */
export interface CookieAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  sessionId?: string;
  csrfToken?: string;
  message?: string;
}

/**
 * Secure Cookie Manager
 * Handles all cookie-based authentication operations
 */
export class SecureCookieManager {
  private readonly ENCRYPTION_KEY: string;
  private readonly SIGNING_SECRET: string;
  
  constructor() {
    this.ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY || this.generateKey();
    this.SIGNING_SECRET = process.env.COOKIE_SIGNING_SECRET || this.generateKey();
  }

  /**
   * Generate encryption key for cookies
   */
  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt cookie data
   */
  private encrypt(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.ENCRYPTION_KEY.slice(0, 64), 'hex'); // Ensure 32 bytes
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // For AES-CBC, we'll use HMAC for authentication instead of GCM
    const hmac = crypto.createHmac('sha256', this.ENCRYPTION_KEY);
    hmac.update(encrypted + iv.toString('hex'));
    const tag = hmac.digest('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag
    };
  }

  /**
   * Decrypt cookie data
   */
  private decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    // Verify HMAC tag first
    const hmac = crypto.createHmac('sha256', this.ENCRYPTION_KEY);
    hmac.update(encryptedData.encrypted + encryptedData.iv);
    const expectedTag = hmac.digest('hex');
    
    if (expectedTag !== encryptedData.tag) {
      throw new Error('Authentication tag verification failed');
    }
    
    const key = Buffer.from(this.ENCRYPTION_KEY.slice(0, 64), 'hex'); // Ensure 32 bytes
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Sign cookie data for integrity
   */
  private sign(data: string): string {
    return crypto.createHmac('sha256', this.SIGNING_SECRET).update(data).digest('hex');
  }

  /**
   * Verify cookie signature
   */
  private verify(data: string, signature: string): boolean {
    const expectedSignature = this.sign(data);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Set authentication cookies
   */
  setAuthCookies(
    res: NextApiResponse | ServerResponse,
    tokens: {
      accessToken: string;
      refreshToken: string;
      sessionId: string;
    }
  ): void {
    const csrfToken = this.generateCSRFToken();
    const now = new Date();

    // Set access token cookie (short-lived)
    const accessTokenData = JSON.stringify({
      token: tokens.accessToken,
      sessionId: tokens.sessionId,
      csrfToken,
      createdAt: now.toISOString()
    });

    const encryptedAccessToken = this.encrypt(accessTokenData);
    const accessTokenValue = JSON.stringify(encryptedAccessToken);
    const accessTokenSignature = this.sign(accessTokenValue);

    const accessTokenCookie = serialize(COOKIE_CONFIG.ACCESS_TOKEN, `${accessTokenValue}.${accessTokenSignature}`, {
      httpOnly: COOKIE_CONFIG.HTTP_ONLY,
      secure: COOKIE_CONFIG.SECURE,
      sameSite: COOKIE_CONFIG.SAME_SITE,
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN_TTL,
      path: COOKIE_CONFIG.PATH,
      domain: COOKIE_CONFIG.DOMAIN
    });

    // Set refresh token cookie (long-lived)
    const refreshTokenData = JSON.stringify({
      token: tokens.refreshToken,
      sessionId: tokens.sessionId,
      createdAt: now.toISOString()
    });

    const encryptedRefreshToken = this.encrypt(refreshTokenData);
    const refreshTokenValue = JSON.stringify(encryptedRefreshToken);
    const refreshTokenSignature = this.sign(refreshTokenValue);

    const refreshTokenCookie = serialize(COOKIE_CONFIG.REFRESH_TOKEN, `${refreshTokenValue}.${refreshTokenSignature}`, {
      httpOnly: COOKIE_CONFIG.HTTP_ONLY,
      secure: COOKIE_CONFIG.SECURE,
      sameSite: COOKIE_CONFIG.SAME_SITE,
      maxAge: COOKIE_CONFIG.REFRESH_TOKEN_TTL,
      path: COOKIE_CONFIG.PATH,
      domain: COOKIE_CONFIG.DOMAIN
    });

    // Set session ID cookie
    const sessionCookie = serialize(COOKIE_CONFIG.SESSION_ID, tokens.sessionId, {
      httpOnly: COOKIE_CONFIG.HTTP_ONLY,
      secure: COOKIE_CONFIG.SECURE,
      sameSite: COOKIE_CONFIG.SAME_SITE,
      maxAge: COOKIE_CONFIG.SESSION_TTL,
      path: COOKIE_CONFIG.PATH,
      domain: COOKIE_CONFIG.DOMAIN
    });

    // Set CSRF token cookie (readable by client for form submission)
    const csrfCookie = serialize(COOKIE_CONFIG.CSRF_TOKEN, csrfToken, {
      httpOnly: false, // Client needs to read this for CSRF protection
      secure: COOKIE_CONFIG.SECURE,
      sameSite: COOKIE_CONFIG.SAME_SITE,
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN_TTL,
      path: COOKIE_CONFIG.PATH,
      domain: COOKIE_CONFIG.DOMAIN
    });

    // Set all cookies
    const cookies = [accessTokenCookie, refreshTokenCookie, sessionCookie, csrfCookie];
    
    if ('setHeader' in res && typeof res.setHeader === 'function') {
      // NextApiResponse or ServerResponse
      res.setHeader('Set-Cookie', cookies);
    }
  }

  /**
   * Get authentication data from cookies
   */
  async getAuthFromCookies(req: NextApiRequest | IncomingMessage): Promise<CookieAuthResult> {
    try {
      const cookies = this.parseCookies(req);
      
      // Get access token
      const accessTokenCookie = cookies[COOKIE_CONFIG.ACCESS_TOKEN];
      if (!accessTokenCookie) {
        return { success: false, message: 'No access token found' };
      }

      // Verify and decrypt access token
      const [accessTokenValue, accessTokenSignature] = accessTokenCookie.split('.');
      if (!this.verify(accessTokenValue, accessTokenSignature)) {
        return { success: false, message: 'Invalid access token signature' };
      }

      const encryptedAccessToken = JSON.parse(accessTokenValue);
      const accessTokenData = JSON.parse(this.decrypt(encryptedAccessToken));

      // Get session ID
      const sessionId = cookies[COOKIE_CONFIG.SESSION_ID];
      if (!sessionId || sessionId !== accessTokenData.sessionId) {
        return { success: false, message: 'Session mismatch' };
      }

      // Get CSRF token
      const csrfToken = cookies[COOKIE_CONFIG.CSRF_TOKEN];
      if (!csrfToken || csrfToken !== accessTokenData.csrfToken) {
        return { success: false, message: 'CSRF token mismatch' };
      }

      // Verify token expiration
      const createdAt = new Date(accessTokenData.createdAt);
      const now = new Date();
      const ageInSeconds = (now.getTime() - createdAt.getTime()) / 1000;
      
      if (ageInSeconds > COOKIE_CONFIG.ACCESS_TOKEN_TTL) {
        return { success: false, message: 'Access token expired' };
      }

      // Get user info from secure user manager using session ID
      const { secureUserManager } = await import('./secure-user-manager');
      const sessionValidation = secureUserManager.validateSession(accessTokenData.sessionId);
      
      if (!sessionValidation.valid) {
        return { success: false, message: 'Invalid session' };
      }

      return {
        success: true,
        user: sessionValidation.user,
        sessionId: accessTokenData.sessionId,
        csrfToken: accessTokenData.csrfToken,
        message: 'Authentication successful'
      };

    } catch (error) {
      console.error('Cookie authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Refresh authentication tokens
   */
  refreshAuthTokens(req: NextApiRequest | IncomingMessage): {
    success: boolean;
    refreshToken?: string;
    sessionId?: string;
    message?: string;
  } {
    try {
      const cookies = this.parseCookies(req);
      
      // Get refresh token
      const refreshTokenCookie = cookies[COOKIE_CONFIG.REFRESH_TOKEN];
      if (!refreshTokenCookie) {
        return { success: false, message: 'No refresh token found' };
      }

      // Verify and decrypt refresh token
      const [refreshTokenValue, refreshTokenSignature] = refreshTokenCookie.split('.');
      if (!this.verify(refreshTokenValue, refreshTokenSignature)) {
        return { success: false, message: 'Invalid refresh token signature' };
      }

      const encryptedRefreshToken = JSON.parse(refreshTokenValue);
      const refreshTokenData = JSON.parse(this.decrypt(encryptedRefreshToken));

      // Verify token expiration
      const createdAt = new Date(refreshTokenData.createdAt);
      const now = new Date();
      const ageInSeconds = (now.getTime() - createdAt.getTime()) / 1000;
      
      if (ageInSeconds > COOKIE_CONFIG.REFRESH_TOKEN_TTL) {
        return { success: false, message: 'Refresh token expired' };
      }

      return {
        success: true,
        refreshToken: refreshTokenData.token,
        sessionId: refreshTokenData.sessionId,
        message: 'Token refresh successful'
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, message: 'Token refresh failed' };
    }
  }

  /**
   * Clear authentication cookies
   */
  clearAuthCookies(res: NextApiResponse | ServerResponse): void {
    const expiredCookies = [
      serialize(COOKIE_CONFIG.ACCESS_TOKEN, '', {
        httpOnly: COOKIE_CONFIG.HTTP_ONLY,
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: 0,
        path: COOKIE_CONFIG.PATH,
        domain: COOKIE_CONFIG.DOMAIN
      }),
      serialize(COOKIE_CONFIG.REFRESH_TOKEN, '', {
        httpOnly: COOKIE_CONFIG.HTTP_ONLY,
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: 0,
        path: COOKIE_CONFIG.PATH,
        domain: COOKIE_CONFIG.DOMAIN
      }),
      serialize(COOKIE_CONFIG.SESSION_ID, '', {
        httpOnly: COOKIE_CONFIG.HTTP_ONLY,
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: 0,
        path: COOKIE_CONFIG.PATH,
        domain: COOKIE_CONFIG.DOMAIN
      }),
      serialize(COOKIE_CONFIG.CSRF_TOKEN, '', {
        httpOnly: false,
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: 0,
        path: COOKIE_CONFIG.PATH,
        domain: COOKIE_CONFIG.DOMAIN
      })
    ];

    if ('setHeader' in res && typeof res.setHeader === 'function') {
      // NextApiResponse or ServerResponse
      res.setHeader('Set-Cookie', expiredCookies);
    }
  }

  /**
   * Parse cookies from request
   */
  private parseCookies(req: NextApiRequest | IncomingMessage): Record<string, string> {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return {};
    }
    
    return parse(cookieHeader);
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(req: NextApiRequest): boolean {
    try {
      const cookies = this.parseCookies(req);
      const cookieCSRFToken = cookies[COOKIE_CONFIG.CSRF_TOKEN];
      
      // Get CSRF token from header or body
      const headerCSRFToken = req.headers['x-csrf-token'] as string;
      const bodyCSRFToken = req.body?.csrfToken;
      
      const submittedCSRFToken = headerCSRFToken || bodyCSRFToken;
      
      return cookieCSRFToken === submittedCSRFToken;
    } catch (error) {
      console.error('CSRF validation error:', error);
      return false;
    }
  }

  /**
   * Get cookie security configuration
   */
  getCookieConfig(): typeof COOKIE_CONFIG {
    return COOKIE_CONFIG;
  }
}

// Export singleton instance
export const secureCookieManager = new SecureCookieManager();

// Middleware function for cookie authentication
export function withCookieAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get authentication from cookies
      const authResult = await secureCookieManager.getAuthFromCookies(req);
      
      if (!authResult.success) {
        return res.status(401).json({
          success: false,
          message: authResult.message || 'Authentication required'
        });
      }

      // Validate CSRF token for state-changing operations
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (!secureCookieManager.validateCSRFToken(req)) {
          return res.status(403).json({
            success: false,
            message: 'CSRF validation failed'
          });
        }
      }

      // Add auth info to request
      (req as any).auth = authResult;

      // Call the handler
      await handler(req, res);

    } catch (error) {
      console.error('Cookie auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication middleware error'
      });
    }
  };
}

export default secureCookieManager;