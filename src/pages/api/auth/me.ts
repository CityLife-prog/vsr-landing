/**
 * Current User Profile API Endpoint
 * SECURITY: Uses secure cookie authentication to return user profile
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { secureCookieManager } from '../../../lib/secure-cookie-auth';
import { simpleAuthService } from '../../../services/SimpleAuthService';
import { secureUserManager } from '../../../lib/secure-user-manager';

async function meHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`,
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Get authentication from secure cookies
    const authResult = secureCookieManager.getAuthFromCookies(req);
    
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message || 'Authentication required',
        error: 'UNAUTHORIZED'
      });
    }

    // Validate session with secure user manager
    const sessionValidation = secureUserManager.validateSession(authResult.sessionId!);
    
    if (!sessionValidation.valid) {
      // Clear invalid cookies
      secureCookieManager.clearAuthCookies(res);
      
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid',
        error: 'SESSION_INVALID'
      });
    }

    const user = sessionValidation.user!;

    // Return user profile (without sensitive data)
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        isActive: user.status === 'active',
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        permissions: [], // Would be populated from user roles
        roles: [user.role]
      },
      authMethod: 'secure_cookies',
      csrfToken: authResult.csrfToken
    });

  } catch (error) {
    console.error('Get user profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving user profile',
      error: 'INTERNAL_ERROR'
    });
  }
}

export default meHandler;