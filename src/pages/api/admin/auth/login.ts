/**
 * Admin Login API Endpoint
 * SECURITY: Uses secure cookie authentication instead of client-side JWT
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '../../../../services/SimpleAuthService';
import { withSecurity } from '../../../../middleware/cors';
import { withAuthRateLimit } from '../../../../middleware/rateLimit';
import { secureCookieManager } from '../../../../lib/secure-cookie-auth';

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
    // Manually read and parse JSON body
    let body: any = {};
    
    if (req.body) {
      // Body already parsed by Next.js
      body = req.body;
    } else {
      // Parse raw body manually
      const rawBody = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk) => {
          data += chunk;
        });
        req.on('end', () => {
          resolve(data);
        });
      });

      if (rawBody) {
        console.log('🔍 Raw body received:', rawBody);
        try {
          body = JSON.parse(rawBody);
        } catch (parseError) {
          console.error('🚨 JSON parse error:', parseError);
          console.error('🚨 Raw body that failed to parse:', JSON.stringify(rawBody));
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid JSON format.',
            error: 'INVALID_JSON'
          });
        }
      }
    }
    
    console.log('📥 Login request body:', body);
    const { email, password, rememberMe } = body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.',
        error: 'INVALID_REQUEST_FORMAT'
      });
    }

    // Get client IP and user agent for security logging
    const clientIP = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log(`Admin login attempt from IP: ${clientIP}, Email: ${email}`);
    
    // Login with secure authentication
    const result = await simpleAuthService.login(email, password, rememberMe || false, clientIP, userAgent);
    
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
      
      // Set secure authentication cookies instead of returning JWT token
      secureCookieManager.setAuthCookies(res, {
        accessToken: result.token!,
        refreshToken: result.token!, // In production, use separate refresh token
        sessionId: result.sessionId!
      });
      
      // Return result without exposing the token
      return res.status(200).json({
        success: true,
        user: result.user,
        message: result.message,
        requiresPasswordChange: result.requiresPasswordChange,
        authMethod: 'secure_cookies'
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

// API route configuration
export const config = {
  api: {
    bodyParser: false, // Disable automatic body parsing
  },
}

export default withAuthRateLimit(withSecurity(handler));