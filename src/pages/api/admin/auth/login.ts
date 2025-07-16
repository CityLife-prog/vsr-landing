/**
 * Admin Login API Endpoint
 */

import { NextApiResponse } from 'next';
import { simpleAuthService } from '../../../../services/SimpleAuthService';
import { withSecurity } from '../../../../middleware/cors';
import { withAuthRateLimit } from '../../../../middleware/rateLimit';

async function handler(req: any, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      message: `Method ${req.method} not allowed`,
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    console.log('📥 Login request body:', req.body);
    const { email, password, rememberMe } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.',
        error: 'INVALID_REQUEST_FORMAT'
      });
    }

    // Rate limiting check (basic)
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Admin login attempt from IP: ${clientIP}, Email: ${email}`);

    // Login
    const result = await simpleAuthService.login(email, password, rememberMe || false);
    
    // Track login attempt in analytics
    try {
      await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/admin/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login_attempt',
          data: {
            loginType: 'admin',
            success: result.success,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (analyticsError) {
      console.error('Analytics tracking failed:', analyticsError);
    }
    
    if (result.success) {
      // Log successful login
      console.log(`Admin login: ${email} at ${new Date().toISOString()}`);
      
      // Check if user is admin
      if (result.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      // Return result with password reset flag
      return res.status(200).json({
        success: true,
        token: result.token,
        user: result.user,
        message: result.message,
        requiresPasswordReset: result.requiresPasswordReset,
        requiresPasswordChange: result.requiresPasswordChange
      });
    } else {
      // Log failed login
      console.warn(`Admin login failed: ${email} at ${new Date().toISOString()}`);
      
      return res.status(401).json({
        success: false,
        message: result.message,
        error: 'LOGIN_FAILED'
      });
    }
  } catch (error) {
    // Enhanced error logging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      endpoint: '/api/admin/auth/login',
      method: req.method,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };
    
    console.error('Admin login error:', errorDetails);
    
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
}

export default withAuthRateLimit(withSecurity(handler));