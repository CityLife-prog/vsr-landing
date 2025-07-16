/**
 * Admin Quote Requests API - Handle quote requests management
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '@/services/SimpleAuthService';
import fs from 'fs';
import path from 'path';

// v2 Quote request data structure (priority column removed)
interface QuoteRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  serviceClass: string;
  service: string;
  details: string;
  photoFiles: string[];
  status: 'pending' | 'review' | 'quoted' | 'accepted' | 'declined';
  submittedAt: Date;
  reviewedAt?: Date;
  quotedAt?: Date;
  quotedAmount?: number;
  estimatedValue?: number;
  assignedTo?: string;
  adminNotes?: string;
  submittedBy?: string;
  updatedBy?: string;
  updatedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Database file path
const DB_FILE = path.join(process.cwd(), 'data', 'quote-requests.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// Load data from file or use default
let quoteRequests: QuoteRequest[] = loadQuoteRequestsFromFile();

function loadQuoteRequestsFromFile(): QuoteRequest[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.map((req: any) => ({
        ...req,
        submittedAt: new Date(req.submittedAt),
        reviewedAt: req.reviewedAt ? new Date(req.reviewedAt) : undefined,
        quotedAt: req.quotedAt ? new Date(req.quotedAt) : undefined,
        updatedAt: req.updatedAt ? new Date(req.updatedAt) : undefined
      }));
    }
  } catch (error) {
    console.error('Error loading quote requests from file:', error);
  }
  
  // Return empty array if file doesn't exist or has errors
  return [];
}

function saveQuoteRequestsToFile(requests: QuoteRequest[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(requests, null, 2));
  } catch (error) {
    console.error('Error saving quote requests to file:', error);
  }
}

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
        // Get all quote requests or specific one
        const { id, status, hideDeclined } = req.query;
        
        let filteredRequests = quoteRequests;
        
        if (status && status !== 'all') {
          filteredRequests = quoteRequests.filter(request => request.status === status);
        }
        
        if (hideDeclined === 'true') {
          filteredRequests = filteredRequests.filter(request => request.status !== 'declined');
        }
        
        if (id) {
          const request = quoteRequests.find(r => r.id === id);
          if (!request) {
            return res.status(404).json({
              success: false,
              message: 'Quote request not found'
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
            quoteRequests: filteredRequests,
            summary: {
              total: quoteRequests.length,
              pending: quoteRequests.filter(r => r.status === 'pending').length,
              review: quoteRequests.filter(r => r.status === 'review').length,
              quoted: quoteRequests.filter(r => r.status === 'quoted').length,
              accepted: quoteRequests.filter(r => r.status === 'accepted').length,
              declined: quoteRequests.filter(r => r.status === 'declined').length
            }
          }
        });

      case 'PATCH':
        // Update quote request status
        const { id: quoteId } = req.query;
        const { status: newStatus, adminNotes, assignedTo: newAssignedTo, quotedAmount, updatedBy } = req.body;

        if (!quoteId) {
          return res.status(400).json({
            success: false,
            message: 'Quote request ID required'
          });
        }

        const requestIndex = quoteRequests.findIndex(r => r.id === quoteId);
        if (requestIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Quote request not found'
          });
        }

        const updatedRequest = { ...quoteRequests[requestIndex] };
        
        if (newStatus) {
          updatedRequest.status = newStatus;
          if (newStatus === 'review' && !updatedRequest.reviewedAt) {
            updatedRequest.reviewedAt = new Date();
          }
          if (newStatus === 'quoted' && !updatedRequest.quotedAt) {
            updatedRequest.quotedAt = new Date();
          }
        }
        
        if (adminNotes !== undefined) {
          updatedRequest.adminNotes = adminNotes;
        }
        
        if (newAssignedTo !== undefined) {
          updatedRequest.assignedTo = newAssignedTo;
        }

        if (quotedAmount !== undefined) {
          updatedRequest.quotedAmount = quotedAmount;
          updatedRequest.estimatedValue = quotedAmount;
        }
        
        if (updatedBy !== undefined) {
          updatedRequest.updatedBy = updatedBy;
          updatedRequest.updatedAt = new Date();
        }

        quoteRequests[requestIndex] = updatedRequest;
        saveQuoteRequestsToFile(quoteRequests);

        return res.status(200).json({
          success: true,
          data: updatedRequest,
          message: 'Quote request updated successfully'
        });

      case 'POST':
        // Handle new quote request or bulk actions
        if (req.body.requestIds) {
          // Bulk action
          const { requestIds, bulkStatus, updatedBy } = req.body;

          if (!Array.isArray(requestIds) || requestIds.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Request IDs array required'
            });
          }

          const updatedRequests = [];
          let updated = 0;

          for (const requestId of requestIds) {
            const index = quoteRequests.findIndex(r => r.id === requestId);
            if (index !== -1) {
              quoteRequests[index] = {
                ...quoteRequests[index],
                status: bulkStatus,
                reviewedAt: bulkStatus === 'review' ? new Date() : quoteRequests[index].reviewedAt,
                quotedAt: bulkStatus === 'quoted' ? new Date() : quoteRequests[index].quotedAt,
                updatedBy: updatedBy || 'Admin',
                updatedAt: new Date()
              };
              updatedRequests.push(quoteRequests[index]);
              updated++;
            }
          }

          saveQuoteRequestsToFile(quoteRequests);
          
          return res.status(200).json({
            success: true,
            data: updatedRequests,
            message: `${updated} quote requests updated to ${bulkStatus}`
          });
        } else {
          // Create new quote request (from website form)
          const newRequest: QuoteRequest = {
            id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            serviceClass: req.body.serviceClass || 'commercial',
            service: req.body.service,
            details: req.body.details,
            photoFiles: req.body.photoFiles || [],
            status: 'pending',
            submittedAt: new Date(),
            submittedBy: req.body.fullName,
            ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
          };

          quoteRequests.unshift(newRequest); // Add to beginning of array
          saveQuoteRequestsToFile(quoteRequests);

          return res.status(201).json({
            success: true,
            data: newRequest,
            message: 'Quote request created successfully'
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
    console.error('Quote requests API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

