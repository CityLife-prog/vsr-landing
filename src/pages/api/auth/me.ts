/**
 * Current User Profile API Endpoint
 * Returns authenticated user's profile information
 */

import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { simpleAuthService } from '../../../services/SimpleAuthService';

async function meHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: true, 
      message: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        message: 'No valid authentication token provided',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Use simple auth service to verify token
      const user = await simpleAuthService.verifyToken(token);
      
      if (!user) {
        return res.status(401).json({
          error: true,
          message: 'User not found or invalid token',
          code: 'USER_NOT_FOUND'
        });
      }

      // Return user profile (without sensitive data)
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.status === 'active',
          lastLoginAt: null,
          metadata: {}
        }
      });

    } catch (jwtError) {
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

  } catch (error) {
    console.error('Get user profile error:', error);

    res.status(500).json({
      error: true,
      message: 'An error occurred while retrieving user profile',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

export default meHandler;