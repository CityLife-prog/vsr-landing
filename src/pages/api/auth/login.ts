/**
 * Login API Endpoint
 * Handles user authentication and JWT token generation
 */

import { NextApiRequest, NextApiResponse } from 'next';
// import { withAuth } from '../../../auth/middleware'; // Not implemented - using basic handler
import { 
  AuthenticationError, 
  AuthErrorCode
} from '../../../auth/types';
// import { createAuthSystem, VSR_AUTH_CONFIG } from '../../../auth'; // Not implemented
// import { PasswordManager, DEFAULT_PASSWORD_CONFIG } from '../../../auth/password'; // Not implemented

// Rate limiting configuration for login attempts
const LOGIN_RATE_LIMIT = {
  enabled: true,
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: true, 
      message: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { email, password } = req.body;

    // Import simple auth service
    const { simpleAuthService } = await import('../../../services/SimpleAuthService');

    // Handle login
    if (!email || !password) {
      return res.status(400).json({
        error: true,
        message: 'Email and password are required',
        code: 'INVALID_INPUT'
      });
    }

    const result = await simpleAuthService.login(email, password);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          user: result.user,
          tokens: {
            accessToken: result.token,
            refreshToken: result.token
          }
        },
        message: result.message
      });
    } else {
      return res.status(401).json({
        error: true,
        message: result.message || 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Placeholder for when auth system is complete:
    /*
    const { email, password, rememberMe = false }: LoginRequest = req.body;

    if (!email || !password) {
      throw new AuthenticationError(
        'Email and password are required',
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // Create auth system
    const { authService, securityService } = createAuthSystem(VSR_AUTH_CONFIG);
    const passwordManager = new PasswordManager(DEFAULT_PASSWORD_CONFIG);

    // Extract device info
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: getClientIP(req),
      fingerprint: req.headers['x-fingerprint'] as string,
      platform: req.headers['x-platform'] as string,
      browser: req.headers['x-browser'] as string
    };

    // Check for account lockout (brute force protection)
    const isLocked = await securityService.isAccountLocked(email);
    if (isLocked) {
      await securityService.logEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        ip: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        timestamp: new Date(),
        details: { 
          email, 
          reason: 'account_locked',
          deviceInfo 
        },
        severity: SecuritySeverity.HIGH
      });

      throw new AuthenticationError(
        'Account is temporarily locked due to multiple failed login attempts',
        AuthErrorCode.ACCOUNT_LOCKED
      );
    }

    // Attempt authentication
    const loginRequest: LoginRequest = {
      email,
      password,
      rememberMe,
      deviceInfo
    };

    const authResult = await authService.login(loginRequest);

    if (!authResult.success) {
      // Log failed login attempt
      await securityService.logEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        ip: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        timestamp: new Date(),
        details: { 
          email, 
          reason: authResult.error?.code || 'invalid_credentials',
          deviceInfo 
        },
        severity: SecuritySeverity.MEDIUM
      });

      // Check for brute force pattern
      const isBruteForce = await securityService.detectSuspiciousActivity(
        email, 
        deviceInfo
      );

      if (isBruteForce) {
        await securityService.lockAccount(email, 'Multiple failed login attempts');
        
        await securityService.logEvent({
          type: SecurityEventType.BRUTE_FORCE_DETECTED,
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          timestamp: new Date(),
          details: { email, deviceInfo },
          severity: SecuritySeverity.CRITICAL
        });
      }

      throw authResult.error || new AuthenticationError(
        'Invalid credentials',
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // Successful login - prepare response
    const response: LoginResponse = {
      user: {
        id: authResult.user!.id,
        email: authResult.user!.email,
        username: authResult.user!.username,
        firstName: authResult.user!.firstName,
        lastName: authResult.user!.lastName,
        isActive: authResult.user!.isActive,
        isEmailVerified: authResult.user!.isEmailVerified,
        lastLoginAt: authResult.user!.lastLoginAt,
        createdAt: authResult.user!.createdAt,
        updatedAt: authResult.user!.updatedAt,
        metadata: authResult.user!.metadata
      },
      tokens: authResult.tokens!,
      requiresTwoFactor: authResult.requiresTwoFactor || false,
      twoFactorMethods: authResult.requiresTwoFactor ? ['email'] : undefined
    };

    // Set secure HTTP-only cookie for refresh token if rememberMe is true
    if (rememberMe) {
      res.setHeader('Set-Cookie', [
        `refreshToken=${authResult.tokens!.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`, // 7 days
        `accessToken=${authResult.tokens!.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${15 * 60}` // 15 minutes
      ]);
    }

    // Log successful login
    await securityService.logEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      userId: authResult.user!.id,
      sessionId: authResult.session?.id,
      ip: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      timestamp: new Date(),
      details: { 
        email, 
        rememberMe,
        deviceInfo 
      },
      severity: SecuritySeverity.LOW
    });

    res.status(200).json({
      success: true,
      data: response,
      message: 'Login successful'
    });
    */

  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof AuthenticationError) {
      const statusCode = getStatusCodeForAuthError(error.code);
      return res.status(statusCode).json({
        error: true,
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }

    // Generic error response
    res.status(500).json({
      error: true,
      message: 'An error occurred during login',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

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

function getStatusCodeForAuthError(code: AuthErrorCode): number {
  switch (code) {
    case AuthErrorCode.ACCOUNT_LOCKED:
      return 423; // Locked
    case AuthErrorCode.ACCOUNT_DISABLED:
      return 403; // Forbidden
    case AuthErrorCode.EMAIL_NOT_VERIFIED:
      return 403; // Forbidden
    case AuthErrorCode.RATE_LIMITED:
      return 429; // Too Many Requests
    case AuthErrorCode.TWO_FACTOR_REQUIRED:
      return 202; // Accepted (partial success)
    default:
      return 401; // Unauthorized
  }
}

// Export with rate limiting protection
// export default withAuth(loginHandler, {
//   optional: true, // Don't require authentication for login endpoint
//   rateLimit: LOGIN_RATE_LIMIT
// });

// Export basic handler since auth system is not implemented
export default loginHandler;