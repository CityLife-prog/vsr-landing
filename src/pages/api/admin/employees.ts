/**
 * Admin Employee Management API Endpoint
 * Handle employee approval, rejection, and management operations
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AdminUserService } from '../../../services/AdminUserService';
import { withAdminAuth } from '../../../middleware/withAdminAuth';
import { ADMIN_PERMISSIONS } from '../../../types/admin';

const adminService = new AdminUserService();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { employeeId, action } = req.query;

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (method) {
      case 'GET':
        if (action === 'pending') {
          // Get pending employee accounts
          const canViewEmployees = await adminService.hasAdminPermission(
            userId,
            ADMIN_PERMISSIONS.EMPLOYEE_MANAGEMENT.VIEW_EMPLOYEES
          );

          if (!canViewEmployees) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }

          const pendingEmployees = await adminService.getPendingEmployeeAccounts();
          return res.status(200).json(pendingEmployees);
        }
        break;

      case 'POST':
        if (action === 'approve' && employeeId) {
          // Approve employee account
          const canApprove = await adminService.hasAdminPermission(
            userId,
            ADMIN_PERMISSIONS.EMPLOYEE_MANAGEMENT.APPROVE_EMPLOYEE
          );

          if (!canApprove) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }

          const { notes } = req.body;
          const approvedEmployee = await adminService.approveEmployeeAccount(
            employeeId as string,
            userId,
            notes
          );

          if (!approvedEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
          }

          return res.status(200).json(approvedEmployee);
        }

        if (action === 'reject' && employeeId) {
          // Reject employee account
          const canReject = await adminService.hasAdminPermission(
            userId,
            ADMIN_PERMISSIONS.EMPLOYEE_MANAGEMENT.REJECT_EMPLOYEE
          );

          if (!canReject) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }

          const { reason } = req.body;
          if (!reason) {
            return res.status(400).json({ error: 'Rejection reason required' });
          }

          const rejected = await adminService.rejectEmployeeAccount(
            employeeId as string,
            userId,
            reason
          );

          if (!rejected) {
            return res.status(404).json({ error: 'Employee not found' });
          }

          return res.status(200).json({ message: 'Employee account rejected' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }

    return res.status(400).json({ error: 'Invalid action or missing parameters' });
  } catch (error) {
    console.error('Admin employees API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAdminAuth(handler);