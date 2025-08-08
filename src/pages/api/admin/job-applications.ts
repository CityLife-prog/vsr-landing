/**
 * Admin Job Applications API - Handle job applications management
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '@/services/SimpleAuthService';
import { secureCookieManager } from '../../../lib/secure-cookie-auth';
import fs from 'fs';
import path from 'path';

// Job application data structure
interface JobApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  resumeFilename?: string;
  status: 'pending' | 'reviewing' | 'interviewed' | 'hired' | 'declined';
  submittedAt: Date;
  reviewedAt?: Date;
  assignedTo?: string;
  adminNotes?: string;
  submittedBy?: string;
  updatedBy?: string;
  updatedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Database file path
const DB_FILE = path.join(process.cwd(), 'data', 'job-applications.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// Load data from file or use default
let jobApplications: JobApplication[] = loadJobApplicationsFromFile();

function loadJobApplicationsFromFile(): JobApplication[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.map((app: any) => ({
        ...app,
        submittedAt: new Date(app.submittedAt),
        reviewedAt: app.reviewedAt ? new Date(app.reviewedAt) : undefined,
        updatedAt: app.updatedAt ? new Date(app.updatedAt) : undefined
      }));
    }
  } catch (error) {
    console.error('Error loading job applications from file:', error);
  }
  
  return [];
}

function saveJobApplicationsToFile(applications: JobApplication[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(applications, null, 2));
  } catch (error) {
    console.error('Error saving job applications to file:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if this is a form submission (POST without auth header for new applications)
    const authHeader = req.headers.authorization;
    const isFormSubmission = req.method === 'POST' && !authHeader && req.body && req.body.name;
    
    if (!isFormSubmission) {
      // Verify admin authentication using cookies
      const authResult = await secureCookieManager.getAuthFromCookies(req);
      if (!authResult.success || !authResult.user || authResult.user.role !== 'admin') {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required or insufficient permissions',
          message: authResult.message
        });
      }
    }

    switch (req.method) {
      case 'GET':
        // Get all job applications or specific one
        const { id, status, hideDeclined } = req.query;
        
        let filteredApplications = jobApplications;
        
        if (status && status !== 'all') {
          filteredApplications = jobApplications.filter(app => app.status === status);
        }
        
        if (hideDeclined === 'true') {
          filteredApplications = filteredApplications.filter(app => app.status !== 'declined');
        }
        
        if (id) {
          const application = jobApplications.find(app => app.id === id);
          if (!application) {
            return res.status(404).json({
              success: false,
              message: 'Job application not found'
            });
          }
          return res.status(200).json({
            success: true,
            data: application
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            jobApplications: filteredApplications,
            summary: {
              total: jobApplications.length,
              pending: jobApplications.filter(app => app.status === 'pending').length,
              reviewing: jobApplications.filter(app => app.status === 'reviewing').length,
              interviewed: jobApplications.filter(app => app.status === 'interviewed').length,
              hired: jobApplications.filter(app => app.status === 'hired').length,
              declined: jobApplications.filter(app => app.status === 'declined').length
            }
          }
        });

      case 'PATCH':
        // Update job application status
        const { id: appId } = req.query;
        const { status: newStatus, adminNotes, assignedTo: newAssignedTo, updatedBy } = req.body;

        if (!appId) {
          return res.status(400).json({
            success: false,
            message: 'Job application ID required'
          });
        }

        const appIndex = jobApplications.findIndex(app => app.id === appId);
        if (appIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Job application not found'
          });
        }

        const updatedApplication = { ...jobApplications[appIndex] };
        
        if (newStatus) {
          updatedApplication.status = newStatus;
          if (newStatus === 'reviewing' && !updatedApplication.reviewedAt) {
            updatedApplication.reviewedAt = new Date();
          }
        }
        
        if (adminNotes !== undefined) {
          updatedApplication.adminNotes = adminNotes;
        }
        
        if (newAssignedTo !== undefined) {
          updatedApplication.assignedTo = newAssignedTo;
        }
        
        if (updatedBy !== undefined) {
          updatedApplication.updatedBy = updatedBy;
          updatedApplication.updatedAt = new Date();
        }

        jobApplications[appIndex] = updatedApplication;
        saveJobApplicationsToFile(jobApplications);

        return res.status(200).json({
          success: true,
          data: updatedApplication,
          message: 'Job application updated successfully'
        });

      case 'POST':
        // Handle new job application or bulk actions
        if (req.body.applicationIds) {
          // Bulk action
          const { applicationIds, bulkStatus, updatedBy } = req.body;

          if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Application IDs array required'
            });
          }

          const updatedApplications = [];
          let updated = 0;

          for (const applicationId of applicationIds) {
            const index = jobApplications.findIndex(app => app.id === applicationId);
            if (index !== -1) {
              jobApplications[index] = {
                ...jobApplications[index],
                status: bulkStatus,
                reviewedAt: bulkStatus === 'reviewing' ? new Date() : jobApplications[index].reviewedAt,
                updatedBy: updatedBy || 'Admin',
                updatedAt: new Date()
              };
              updatedApplications.push(jobApplications[index]);
              updated++;
            }
          }

          saveJobApplicationsToFile(jobApplications);
          
          return res.status(200).json({
            success: true,
            data: updatedApplications,
            message: `${updated} job applications updated to ${bulkStatus}`
          });
        } else {
          // Create new job application (from website form)
          const newApplication: JobApplication = {
            id: `ja_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            experience: req.body.experience,
            resumeFilename: req.body.resumeFilename,
            status: 'pending',
            submittedAt: new Date(),
            submittedBy: req.body.name,
            ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
          };

          jobApplications.unshift(newApplication); // Add to beginning of array
          saveJobApplicationsToFile(jobApplications);

          return res.status(201).json({
            success: true,
            data: newApplication,
            message: 'Job application created successfully'
          });
        }

      case 'DELETE':
        // Delete specific job application
        const { id: deleteId } = req.query;

        if (!deleteId) {
          return res.status(400).json({
            success: false,
            message: 'Job application ID required for deletion'
          });
        }

        const deleteIndex = jobApplications.findIndex(app => app.id === deleteId);
        if (deleteIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Job application not found'
          });
        }

        // Remove the application from the array
        const deletedApplication = jobApplications.splice(deleteIndex, 1)[0];
        saveJobApplicationsToFile(jobApplications);

        return res.status(200).json({
          success: true,
          message: 'Job application deleted successfully',
          data: {
            deleted: deletedApplication,
            remaining: jobApplications.length
          }
        });

      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'POST', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Job applications API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}