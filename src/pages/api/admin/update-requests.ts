/**
 * Admin Update Requests API - Handle client update requests management
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '@/services/SimpleAuthService';

// v2 data structure for update requests (priority column removed)
interface UpdateRequest {
  id: string;
  contractId: string;
  customerName: string;
  email: string;
  phone: string;
  reasonForContact: string;
  jobDescription: string;
  notes: string;
  files: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'resolved';
  submittedAt: Date;
  completedAt?: Date;
  assignedTo?: string;
  adminNotes?: string;
}

// Database-driven storage - no static entries for v3
let updateRequests: UpdateRequest[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Allow system token for internal API calls
      if (token === 'system_token') {
        // Internal system call - allowed
      } else {
        const user = await simpleAuthService.verifyToken(token);
        if (!user || user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Admin access required'
          });
        }
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    switch (req.method) {
      case 'GET':
        // Get all update requests or specific one
        const { id, status } = req.query;
        
        let filteredRequests = updateRequests;
        
        if (status && status !== 'all') {
          filteredRequests = updateRequests.filter(request => request.status === status);
        }
        
        if (id) {
          const request = updateRequests.find(r => r.id === id);
          if (!request) {
            return res.status(404).json({
              success: false,
              message: 'Update request not found'
            });
          }
          return res.status(200).json({
            success: true,
            data: request
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            updateRequests: filteredRequests,
            summary: {
              total: updateRequests.length,
              pending: updateRequests.filter(r => r.status === 'pending').length,
              inProgress: updateRequests.filter(r => r.status === 'in_progress').length,
              completed: updateRequests.filter(r => r.status === 'completed').length
            }
          }
        });

      case 'PATCH':
        // Update request status
        const { id: updateId } = req.query;
        const { status: newStatus, adminNotes, assignedTo: newAssignedTo } = req.body;

        if (!updateId) {
          return res.status(400).json({
            success: false,
            message: 'Update request ID required'
          });
        }

        const requestIndex = updateRequests.findIndex(r => r.id === updateId);
        if (requestIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Update request not found'
          });
        }

        const updatedRequest = { ...updateRequests[requestIndex] };
        
        if (newStatus) {
          updatedRequest.status = newStatus;
          if (newStatus === 'completed' && !updatedRequest.completedAt) {
            updatedRequest.completedAt = new Date();
          }
        }
        
        if (adminNotes !== undefined) {
          updatedRequest.adminNotes = adminNotes;
        }
        
        if (newAssignedTo !== undefined) {
          updatedRequest.assignedTo = newAssignedTo;
        }

        updateRequests[requestIndex] = updatedRequest;

        return res.status(200).json({
          success: true,
          data: updatedRequest,
          message: 'Update request updated successfully'
        });

      case 'POST':
        // Handle bulk actions or create new update request
        if (req.body.requestIds) {
          // Bulk action
          const { requestIds, bulkStatus } = req.body;

          if (!Array.isArray(requestIds) || requestIds.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Request IDs array required'
            });
          }

          const updatedRequests = [];
          let updated = 0;

          for (const requestId of requestIds) {
            const index = updateRequests.findIndex(r => r.id === requestId);
            if (index !== -1) {
              updateRequests[index] = {
                ...updateRequests[index],
                status: bulkStatus || 'completed',
                completedAt: bulkStatus === 'completed' ? new Date() : updateRequests[index].completedAt
              };
              updatedRequests.push(updateRequests[index]);
              updated++;
            }
          }

          return res.status(200).json({
            success: true,
            data: updatedRequests,
            message: `${updated} update requests marked as ${bulkStatus || 'completed'}`
          });
        } else {
          // Create new update request (v2: no priority column)
          const newRequest: UpdateRequest = {
            id: `ur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contractId: req.body.contractId || 'No Contract ID',
            customerName: req.body.customerName,
            email: req.body.email,
            phone: req.body.phone,
            reasonForContact: req.body.reasonForContact,
            jobDescription: req.body.jobDescription,
            notes: req.body.notes,
            files: req.body.files || [],
            status: 'pending',
            submittedAt: new Date()
          };

          updateRequests.unshift(newRequest); // Add to beginning of array

          return res.status(201).json({
            success: true,
            data: newRequest,
            message: 'Update request created successfully'
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'POST']);
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Update requests API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}