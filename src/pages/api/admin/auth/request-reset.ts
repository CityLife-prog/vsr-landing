/**
 * Admin Password Reset Request API Endpoint
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
    const { email } = req.body;

    // Input validation
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required.',
        error: 'INVALID_REQUEST_FORMAT'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
        error: 'INVALID_EMAIL_FORMAT'
      });
    }

    // Rate limiting check
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Password reset request from IP: ${clientIP}, Email: ${email}`);

    // Request password reset
    const resetResult = await simpleAuthService.requestPasswordReset(email);
    
    // Always return success for security (don't reveal if email exists)
    console.log(`Password reset request for ${email} at ${new Date().toISOString()}`);
    
    return res.status(200).json({
      success: true,
      message: resetResult.message
    });

  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      endpoint: '/api/admin/auth/request-reset',
      method: req.method,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };
    
    console.error('Password reset request error:', errorDetails);
    
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
}

export default withAuthRateLimit(withSecurity(handler));