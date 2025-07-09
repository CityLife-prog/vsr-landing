/**
 * Admin Authentication Middleware
 * Verify admin authentication and permissions for admin-only endpoints
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AdminUserService } from '../services/AdminUserService';
import jwt from 'jsonwebtoken';

interface AdminApiRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    adminLevel: string;
  };
}

type AdminApiHandler = (req: AdminApiRequest, res: NextApiResponse) => Promise<void> | void;

const adminService = new AdminUserService();

export function withAdminAuth(handler: AdminApiHandler) {
  return async (req: AdminApiRequest, res: NextApiResponse) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify JWT token
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      let decoded: any;
      
      try {
        decoded = jwt.verify(token, secret);
      } catch (jwtError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const userId = decoded.sub || decoded.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }

      // Check if user is an admin
      const adminUser = await adminService.getAdminUser(userId);
      if (!adminUser) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Check if admin user is active
      if (!adminUser.isActive) {
        return res.status(403).json({ error: 'Admin account is inactive' });
      }

      // Verify admin console access
      const hasAccess = await adminService.verifyAdminConsoleAccess(userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Admin console access denied' });
      }

      // Add user info to request
      req.user = {
        id: adminUser.id,
        email: adminUser.email,
        adminLevel: adminUser.adminLevel
      };

      // Call the actual handler
      return handler(req, res);
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Middleware to check specific admin permissions
 */
export function withAdminPermission(permission: string) {
  return function(handler: AdminApiHandler) {
    return withAdminAuth(async (req: AdminApiRequest, res: NextApiResponse) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user has the required permission
        const hasPermission = await adminService.hasAdminPermission(userId, permission);
        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: permission
          });
        }

        return handler(req, res);
      } catch (error) {
        console.error('Admin permission check error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  };
}

/**
 * Middleware to check admin level
 */
export function withAdminLevel(requiredLevel: 'super_admin' | 'admin' | 'manager') {
  const levelHierarchy = {
    'super_admin': 3,
    'admin': 2,
    'manager': 1
  };

  return function(handler: AdminApiHandler) {
    return withAdminAuth(async (req: AdminApiRequest, res: NextApiResponse) => {
      try {
        const userLevel = req.user?.adminLevel;
        if (!userLevel) {
          return res.status(401).json({ error: 'Admin level not found' });
        }

        const userLevelValue = levelHierarchy[userLevel as keyof typeof levelHierarchy];
        const requiredLevelValue = levelHierarchy[requiredLevel];

        if (userLevelValue < requiredLevelValue) {
          return res.status(403).json({ 
            error: 'Insufficient admin level',
            required: requiredLevel,
            current: userLevel
          });
        }

        return handler(req, res);
      } catch (error) {
        console.error('Admin level check error:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  };
}