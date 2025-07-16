/**
 * Admin Password Reset API Endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '../../../../services/SimpleAuthService';
import { withSecurity } from '../../../../middleware/cors';
import { withAuthRateLimit } from '../../../../middleware/rateLimit';

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

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
        error: 'INVALID_PASSWORD'
      });
    }

    // Rate limiting check
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Password reset attempt from IP: ${clientIP}, Token: ${token.substring(0, 8)}...`);

    // Reset password
    const resetResult = await simpleAuthService.resetPasswordWithToken(token, newPassword);
    
    if (resetResult.success) {
      console.log(`Password reset successful for token: ${token.substring(0, 8)}... at ${new Date().toISOString()}`);
      
      return res.status(200).json({
        success: true,
        token: resetResult.token,
        user: resetResult.user,
        message: resetResult.message
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