/**
 * Admin Users API Endpoint
 * Handle admin user management operations
 */

import { NextApiResponse } from 'next';
import { AdminUserService } from '../../../services/AdminUserService';
import { withAdminAuth } from '../../../middleware/withAdminAuth';
import { withAdminRateLimit } from '../../../middleware/rateLimit';
import { ADMIN_PERMISSIONS } from '../../../types/admin';
import {
  AdminApiRequest,
  CreateUserRequest,
  UpdateUserRequest,
  AdminUsersQuery,
  AdminUsersResponse,
  AdminApiError
} from '../../../types/admin-api';

interface AuthenticatedAdminApiRequest<T = any> extends AdminApiRequest<T> {
  user?: {
    id: string;
    email: string;
    adminLevel: string;
  };
}

const adminService = new AdminUserService();

async function handler(
  req: AuthenticatedAdminApiRequest<any>, 
  res: NextApiResponse<AdminUsersResponse | AdminApiError>
) {
  const { method } = req;
  const { userId } = req.query as AdminUsersQuery;

  try {
    switch (method) {
      case 'GET':
        if (userId) {
          // Get specific admin user
          const user = await adminService.getAdminUser(userId);
          if (!user) {
            return res.status(404).json({ 
              success: false,
              message: 'Admin user not found',
              error: 'USER_NOT_FOUND'
            });
          }
          return res.status(200).json({
            success: true,
            user,
            message: 'User retrieved successfully'
          });
        } else {
          // Get all admin users
          const users = await adminService.getAdminUsers();
          return res.status(200).json({
            success: true,
            users,
            total: users.length,
            message: 'Users retrieved successfully'
          });
        }

      case 'POST':
        // Create new admin user
        const { userData } = req.body as CreateUserRequest;
        const createdBy = req.user?.id;

        if (!createdBy) {
          return res.status(401).json({ 
            success: false,
            message: 'Unauthorized',
            error: 'UNAUTHORIZED'
          });
        }

        // Check if user has permission to create admin users
        const canCreate = await adminService.hasAdminPermission(
          createdBy,
          ADMIN_PERMISSIONS.USER_MANAGEMENT.CREATE_USER
        );

        if (!canCreate) {
          return res.status(403).json({ 
            success: false,
            message: 'Insufficient permissions',
            error: 'INSUFFICIENT_PERMISSIONS'
          });
        }

        const newUser = await adminService.createAdminUser(userData, createdBy);
        return res.status(201).json({
          success: true,
          user: newUser,
          message: 'Admin user created successfully'
        });

      case 'PUT':
        // Update admin user
        if (!userId) {
          return res.status(400).json({ 
            success: false,
            message: 'User ID required',
            error: 'MISSING_USER_ID'
          });
        }

        const { updates } = req.body as UpdateUserRequest;
        const updatedBy = req.user?.id;

        if (!updatedBy) {
          return res.status(401).json({ 
            success: false,
            message: 'Unauthorized',
            error: 'UNAUTHORIZED'
          });
        }

        // Check if user has permission to update admin users
        const canUpdate = await adminService.hasAdminPermission(
          updatedBy,
          ADMIN_PERMISSIONS.USER_MANAGEMENT.UPDATE_USER
        );

        if (!canUpdate) {
          return res.status(403).json({ 
            success: false,
            message: 'Insufficient permissions',
            error: 'INSUFFICIENT_PERMISSIONS'
          });
        }

        const updatedUser = await adminService.updateAdminUser(
          userId,
          updates,
          updatedBy
        );

        if (!updatedUser) {
          return res.status(404).json({ 
            success: false,
            message: 'Admin user not found',
            error: 'USER_NOT_FOUND'
          });
        }

        return res.status(200).json({
          success: true,
          user: updatedUser,
          message: 'Admin user updated successfully'
        });

      case 'DELETE':
        // Delete admin user
        if (!userId) {
          return res.status(400).json({ 
            success: false,
            message: 'User ID required',
            error: 'MISSING_USER_ID'
          });
        }

        const deletedBy = req.user?.id;

        if (!deletedBy) {
          return res.status(401).json({ 
            success: false,
            message: 'Unauthorized',
            error: 'UNAUTHORIZED'
          });
        }

        // Check if user has permission to delete admin users
        const canDelete = await adminService.hasAdminPermission(
          deletedBy,
          ADMIN_PERMISSIONS.USER_MANAGEMENT.DELETE_USER
        );

        if (!canDelete) {
          return res.status(403).json({ 
            success: false,
            message: 'Insufficient permissions',
            error: 'INSUFFICIENT_PERMISSIONS'
          });
        }

        const deleted = await adminService.deleteAdminUser(userId, deletedBy);

        if (!deleted) {
          return res.status(404).json({ 
            success: false,
            message: 'Admin user not found',
            error: 'USER_NOT_FOUND'
          });
        }

        return res.status(200).json({ 
          success: true,
          message: 'Admin user deleted successfully' 
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          success: false,
          message: `Method ${method} not allowed`,
          error: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAdminAuth(withAdminRateLimit(handler));