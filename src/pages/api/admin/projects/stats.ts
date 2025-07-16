/**
 * Admin Project Statistics API Endpoint
 * Returns project statistics including total, active, completed and breakdown by service type
 */

import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

interface Project {
  id: string;
  title: string;
  serviceType: string;
  currentStatus: number;
  statusLabels: string[];
  showStatusBar: boolean;
}

async function projectStatsHandler(req: NextApiRequest, res: NextApiResponse) {
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
      // Verify the JWT token
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Use shared project data store - in production this would come from database
    const projectsStore: Project[] = [
      {
        id: '1',
        title: 'Commercial Snow Removal - Office Complex',
        serviceType: 'snow-ice-removal',
        currentStatus: 3, // Active
        statusLabels: ['Quote Request', 'Quote Response', 'Contract Signed', 'Service Active', 'Service Complete'],
        showStatusBar: false,
      },
      {
        id: '2',
        title: 'Residential Landscaping Project',
        serviceType: 'landscaping',
        currentStatus: 2, // Active
        statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Service Phase 1', 'Service Phase 2', 'Service Complete'],
        showStatusBar: true,
      },
      {
        id: '3',
        title: 'Commercial Concrete Repair',
        serviceType: 'concrete-asphalt',
        currentStatus: 1, // Active
        statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Started Service', 'Service Complete'],
        showStatusBar: true,
      },
      {
        id: '4',
        title: 'Residential Driveway Repair',
        serviceType: 'concrete-asphalt',
        currentStatus: 4, // Complete
        statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Started Service', 'Service Complete'],
        showStatusBar: true,
      },
      {
        id: '5',
        title: 'Commercial Building Demolition',
        serviceType: 'demolition',
        currentStatus: 3, // Active
        statusLabels: ['Quote Request', 'Quote Response', 'Permits Acquired', 'Demolition Started', 'Cleanup Complete'],
        showStatusBar: true,
      },
      {
        id: '6',
        title: 'Office Painting Project',
        serviceType: 'painting',
        currentStatus: 4, // Complete
        statusLabels: ['Quote Request', 'Quote Response', 'Materials Ordered', 'Painting Started', 'Project Complete'],
        showStatusBar: true,
      }
    ];

    // Calculate statistics
    const totalProjects = projectsStore.length;
    
    // A project is considered complete if currentStatus equals statusLabels.length - 1
    const completedProjects = projectsStore.filter(project => 
      project.currentStatus >= project.statusLabels.length - 1
    ).length;
    
    const activeProjects = totalProjects - completedProjects;

    // Calculate by service type
    const byServiceType: { [key: string]: { total: number; completed: number; active: number } } = {};
    
    projectsStore.forEach(project => {
      if (!byServiceType[project.serviceType]) {
        byServiceType[project.serviceType] = { total: 0, completed: 0, active: 0 };
      }
      
      byServiceType[project.serviceType].total++;
      
      if (project.currentStatus >= project.statusLabels.length - 1) {
        byServiceType[project.serviceType].completed++;
      } else {
        byServiceType[project.serviceType].active++;
      }
    });

    const stats = {
      totalProjects,
      activeProjects,
      completedProjects,
      byServiceType
    };

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get project stats error:', error);

    res.status(500).json({
      error: true,
      message: 'An error occurred while retrieving project statistics',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

export default projectStatsHandler;