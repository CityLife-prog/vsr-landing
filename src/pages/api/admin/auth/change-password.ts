/**
 * Admin Change Password API Endpoint
 * SECURITY: Uses secure cookie authentication and password validation
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '../../../../services/SimpleAuthService';
import { withSecurity } from '../../../../middleware/cors';
import { secureCookieManager } from '../../../../lib/secure-cookie-auth';
import { passwordSecurity } from '../../../../lib/password-security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed',
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Authenticate user with secure cookies
    const authResult = secureCookieManager.getAuthFromCookies(req);
    
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message || 'Authentication required',
        error: 'UNAUTHORIZED'
      });
    }

    // Validate CSRF token
    if (!secureCookieManager.validateCSRFToken(req)) {
      return res.status(403).json({
        success: false,
        message: 'CSRF validation failed',
        error: 'CSRF_VALIDATION_FAILED'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Input validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password and new password are required',
        error: 'MISSING_FIELDS'
      });
    }

    // Validate new password strength using security system
    const passwordValidation = passwordSecurity.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        error: 'WEAK_PASSWORD',
        details: {
          errors: passwordValidation.errors,
          suggestions: passwordValidation.suggestions,
          score: passwordValidation.score
        }
      });
    }

    // Get user email from session (more secure than client-provided email)
    const userEmail = authResult.user?.email;
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: 'User email not found in session',
        error: 'INVALID_SESSION'
      });
    }

    // Log password change attempt
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Password change attempt for ${userEmail} from IP: ${clientIP} at ${new Date().toISOString()}`);

    const result = await simpleAuthService.changePassword(userEmail, currentPassword, newPassword);

    if (result.success) {
      console.log(`Successful password change for ${userEmail} at ${new Date().toISOString()}`);
      
      // Update authentication cookies with new token
      if (result.token) {
        secureCookieManager.setAuthCookies(res, {
          accessToken: result.token,
          refreshToken: result.token,
          sessionId: authResult.sessionId!
        });
      }
      
      return res.status(200).json({
        success: true,
        user: result.user,
        message: result.message,
        authMethod: 'secure_cookies'
      });
    } else {
      console.warn(`Failed password change for ${userEmail}: ${result.message} at ${new Date().toISOString()}`);
      
      return res.status(400).json({
        success: false,
        message: result.message,
        error: 'CHANGE_FAILED'
      });
    }
  } catch (error) {
    // Enhanced error logging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      endpoint: '/api/admin/auth/change-password',
      method: req.method,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };
    
    console.error('Change password error:', errorDetails);
    
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
}

export default withSecurity(handler);