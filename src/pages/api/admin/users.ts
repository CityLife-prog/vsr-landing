/**
 * Admin Users API Endpoint
 * Handle admin user management operations
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AdminUserService } from '../../../services/AdminUserService';
import { withAdminAuth } from '../../../middleware/withAdminAuth';
import { ADMIN_PERMISSIONS } from '../../../types/admin';

const adminService = new AdminUserService();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { userId } = req.query;

  try {
    switch (method) {
      case 'GET':
        if (userId) {
          // Get specific admin user
          const user = await adminService.getAdminUser(userId as string);
          if (!user) {
            return res.status(404).json({ error: 'Admin user not found' });
          }
          return res.status(200).json(user);
        } else {
          // Get all admin users
          const users = await adminService.getAdminUsers();
          return res.status(200).json(users);
        }

      case 'POST':
        // Create new admin user
        const { userData } = req.body;
        const createdBy = req.user?.id;

        if (!createdBy) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user has permission to create admin users
        const canCreate = await adminService.hasAdminPermission(
          createdBy,
          ADMIN_PERMISSIONS.USER_MANAGEMENT.CREATE_USER
        );

        if (!canCreate) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const newUser = await adminService.createAdminUser(userData, createdBy);
        return res.status(201).json(newUser);

      case 'PUT':
        // Update admin user
        if (!userId) {
          return res.status(400).json({ error: 'User ID required' });
        }

        const { updates } = req.body;
        const updatedBy = req.user?.id;

        if (!updatedBy) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user has permission to update admin users
        const canUpdate = await adminService.hasAdminPermission(
          updatedBy,
          ADMIN_PERMISSIONS.USER_MANAGEMENT.UPDATE_USER
        );

        if (!canUpdate) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const updatedUser = await adminService.updateAdminUser(
          userId as string,
          updates,
          updatedBy
        );

        if (!updatedUser) {
          return res.status(404).json({ error: 'Admin user not found' });
        }

        return res.status(200).json(updatedUser);

      case 'DELETE':
        // Delete admin user
        if (!userId) {
          return res.status(400).json({ error: 'User ID required' });
        }

        const deletedBy = req.user?.id;

        if (!deletedBy) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user has permission to delete admin users
        const canDelete = await adminService.hasAdminPermission(
          deletedBy,
          ADMIN_PERMISSIONS.USER_MANAGEMENT.DELETE_USER
        );

        if (!canDelete) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const deleted = await adminService.deleteAdminUser(userId as string, deletedBy);

        if (!deleted) {
          return res.status(404).json({ error: 'Admin user not found' });
        }

        return res.status(200).json({ message: 'Admin user deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAdminAuth(handler);