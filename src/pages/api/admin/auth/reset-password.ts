/**
 * Admin Password Reset API Endpoint
 * SECURITY: Uses secure password validation and cookie authentication
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '../../../../services/SimpleAuthService';
import { withSecurity } from '../../../../middleware/cors';
import { withAuthRateLimit } from '../../../../middleware/rateLimit';
import { secureCookieManager } from '../../../../lib/secure-cookie-auth';
import { passwordSecurity } from '../../../../lib/password-security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      message: `Method ${req.method} not allowed`,
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { token, newPassword } = req.body;

    // Input validation
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset token and new password are required.',
        error: 'INVALID_REQUEST_FORMAT'
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

    // Rate limiting check
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Password reset attempt from IP: ${clientIP}, Token: ${token.substring(0, 8)}...`);

    // Reset password
    const resetResult = await simpleAuthService.resetPasswordWithToken(token, newPassword);
    
    if (resetResult.success) {
      console.log(`Password reset successful for token: ${token.substring(0, 8)}... at ${new Date().toISOString()}`);
      
      // Set secure authentication cookies for the user
      if (resetResult.token) {
        secureCookieManager.setAuthCookies(res, {
          accessToken: resetResult.token,
          refreshToken: resetResult.token,
          sessionId: `session_${Date.now()}_${Math.random()}`
        });
      }
      
      return res.status(200).json({
        success: true,
        user: resetResult.user,
        message: resetResult.message,
        authMethod: 'secure_cookies'
      });
    }

    // Log failed reset attempt
    console.warn(`Failed password reset attempt from IP: ${clientIP} for token: ${token.substring(0, 8)}... at ${new Date().toISOString()}`);

    return res.status(400).json({ 
      success: false, 
      message: resetResult.message,
      error: 'RESET_FAILED'
    });

  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      endpoint: '/api/admin/auth/reset-password',
      method: req.method,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };
    
    console.error('Password reset error:', errorDetails);
    
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
}

export default withAuthRateLimit(withSecurity(handler));