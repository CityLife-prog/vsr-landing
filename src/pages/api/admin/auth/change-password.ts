/**
 * Admin Change Password API Endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '../../../../services/SimpleAuthService';
import { withSecurity } from '../../../../middleware/cors';

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
    const { email, currentPassword, newPassword } = req.body;

    // Input validation
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and new password are required',
        error: 'MISSING_FIELDS'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format',
        error: 'INVALID_EMAIL'
      });
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'New password must be at least 8 characters long',
        error: 'WEAK_PASSWORD'
      });
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'admin123', 'qwerty123'];
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      return res.status(400).json({ 
        success: false,
        message: 'Password too common, please choose a stronger password',
        error: 'COMMON_PASSWORD'
      });
    }

    // Log password change attempt
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Password change attempt for ${email} from IP: ${clientIP} at ${new Date().toISOString()}`);

    const result = await simpleAuthService.changePassword(email, currentPassword, newPassword);

    if (result.success) {
      console.log(`Successful password change for ${email} at ${new Date().toISOString()}`);
      
      return res.status(200).json({
        success: true,
        token: result.token,
        user: result.user,
        message: result.message
      });
    } else {
      console.warn(`Failed password change for ${email}: ${result.message} at ${new Date().toISOString()}`);
      
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