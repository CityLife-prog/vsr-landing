/**
 * Admin Bulk Actions API Endpoint
 * Handle bulk operations for user and employee management
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AdminUserService } from '../../../services/AdminUserService';
import { withAdminAuth } from '../../../middleware/withAdminAuth';
import { ADMIN_PERMISSIONS } from '../../../types/admin';

const adminService = new AdminUserService();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (method) {
      case 'POST':
        const { action, targets, data } = req.body;

        if (!action || !targets || !Array.isArray(targets)) {
          return res.status(400).json({ error: 'Invalid request format' });
        }

        switch (action) {
          case 'approve_employees':
            const canApprove = await adminService.hasAdminPermission(
              userId,
              ADMIN_PERMISSIONS.EMPLOYEE_MANAGEMENT.APPROVE_EMPLOYEE
            );

            if (!canApprove) {
              return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const approvedResults = [];
            for (const employeeId of targets) {
              try {
                const result = await adminService.approveEmployeeAccount(
                  employeeId,
                  userId,
                  data?.notes
                );
                if (result) {
                  approvedResults.push({ id: employeeId, success: true, result });
                } else {
                  approvedResults.push({ id: employeeId, success: false, error: 'Employee not found' });
                }
              } catch (error) {
                approvedResults.push({ 
                  id: employeeId, 
                  success: false, 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                });
              }
            }

            return res.status(200).json({
              action: 'approve_employees',
              results: approvedResults,
              total: targets.length,
              successful: approvedResults.filter(r => r.success).length
            });

          case 'reject_employees':
            const canReject = await adminService.hasAdminPermission(
              userId,
              ADMIN_PERMISSIONS.EMPLOYEE_MANAGEMENT.REJECT_EMPLOYEE
            );

            if (!canReject) {
              return res.status(403).json({ error: 'Insufficient permissions' });
            }

            if (!data?.reason) {
              return res.status(400).json({ error: 'Rejection reason required' });
            }

            const rejectedResults = [];
            for (const employeeId of targets) {
              try {
                const result = await adminService.rejectEmployeeAccount(
                  employeeId,
                  userId,
                  data.reason
                );
                rejectedResults.push({ id: employeeId, success: result });
              } catch (error) {
                rejectedResults.push({ 
                  id: employeeId, 
                  success: false, 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                });
              }
            }

            return res.status(200).json({
              action: 'reject_employees',
              results: rejectedResults,
              total: targets.length,
              successful: rejectedResults.filter(r => r.success).length
            });

          case 'delete_users':
            const canDelete = await adminService.hasAdminPermission(
              userId,
              ADMIN_PERMISSIONS.USER_MANAGEMENT.DELETE_USER
            );

            if (!canDelete) {
              return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const deletedResults = [];
            for (const targetUserId of targets) {
              try {
                const result = await adminService.deleteAdminUser(targetUserId, userId);
                deletedResults.push({ id: targetUserId, success: result });
              } catch (error) {
                deletedResults.push({ 
                  id: targetUserId, 
                  success: false, 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                });
              }
            }

            return res.status(200).json({
              action: 'delete_users',
              results: deletedResults,
              total: targets.length,
              successful: deletedResults.filter(r => r.success).length
            });

          case 'activate_users':
            const canUpdate = await adminService.hasAdminPermission(
              userId,
              ADMIN_PERMISSIONS.USER_MANAGEMENT.UPDATE_USER
            );

            if (!canUpdate) {
              return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const activatedResults = [];
            for (const targetUserId of targets) {
              try {
                const result = await adminService.updateAdminUser(
                  targetUserId,
                  { isActive: true },
                  userId
                );
                activatedResults.push({ id: targetUserId, success: !!result, result });
              } catch (error) {
                activatedResults.push({ 
                  id: targetUserId, 
                  success: false, 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                });
              }
            }

            return res.status(200).json({
              action: 'activate_users',
              results: activatedResults,
              total: targets.length,
              successful: activatedResults.filter(r => r.success).length
            });

          case 'deactivate_users':
            const canDeactivate = await adminService.hasAdminPermission(
              userId,
              ADMIN_PERMISSIONS.USER_MANAGEMENT.UPDATE_USER
            );

            if (!canDeactivate) {
              return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const deactivatedResults = [];
            for (const targetUserId of targets) {
              try {
                const result = await adminService.updateAdminUser(
                  targetUserId,
                  { isActive: false },
                  userId
                );
                deactivatedResults.push({ id: targetUserId, success: !!result, result });
              } catch (error) {
                deactivatedResults.push({ 
                  id: targetUserId, 
                  success: false, 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                });
              }
            }

            return res.status(200).json({
              action: 'deactivate_users',
              results: deactivatedResults,
              total: targets.length,
              successful: deactivatedResults.filter(r => r.success).length
            });

          default:
            return res.status(400).json({ error: 'Invalid action' });
        }

      default:
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Admin bulk actions API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAdminAuth(handler);