/**
 * Admin Project Update API Endpoint
 * Handles individual project updates
 */

import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

interface Project {
  id: string;
  title: string;
  propertyCode?: string;
  client: string;
  serviceClass: 'commercial' | 'residential';
  serviceType: string;
  currentStatus: number;
  statusLabels: string[];
  showStatusBar: boolean;
  createdDate: string;
  lastUpdated: string;
  adminNotes?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contact?: {
    name: string;
    phone: string;
    email: string;
  };
}

// In-memory storage - in production this would be a database
let projectsStore: Project[] = [
  {
    id: '1',
    title: 'Commercial Snow Removal - Office Complex',
    propertyCode: 'COM-001',
    client: 'ABC Corporation',
    serviceClass: 'commercial',
    serviceType: 'snow-ice-removal',
    currentStatus: 3,
    statusLabels: ['Quote Request', 'Quote Response', 'Contract Signed', 'Service Active', 'Service Complete'],
    showStatusBar: false,
    createdDate: '2024-01-15',
    lastUpdated: '2024-01-20',
    adminNotes: 'Priority client - requires weekly updates',
    address: {
      street: '123 Business Park Dr',
      city: 'Grand Rapids',
      state: 'MI',
      zipCode: '49503'
    },
    contact: {
      name: 'John Manager',
      phone: '(616) 555-0123',
      email: 'john@abccorp.com'
    }
  },
  {
    id: '2',
    title: 'Residential Landscaping Project',
    propertyCode: 'RES-002',
    client: 'John Smith',
    serviceClass: 'residential',
    serviceType: 'landscaping',
    currentStatus: 2,
    statusLabels: ['Quote Request', 'Quote Response', 'Scheduled Review', 'Service Phase 1', 'Service Phase 2', 'Service Complete'],
    showStatusBar: true,
    createdDate: '2024-01-10',
    lastUpdated: '2024-01-18',
    adminNotes: 'Client requested specific plant varieties',
    address: {
      street: '456 Maple Street',
      city: 'Wyoming',
      state: 'MI',
      zipCode: '49509'
    },
    contact: {
      name: 'John Smith',
      phone: '(616) 555-0456',
      email: 'john.smith@email.com'
    }
  }
];

async function projectUpdateHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
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

    const { id } = req.query;
    const updateData = req.body;

    // Find and update the project
    const projectIndex = projectsStore.findIndex(project => project.id === id);
    
    if (projectIndex === -1) {
      return res.status(404).json({
        error: true,
        message: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Update the project
    projectsStore[projectIndex] = {
      ...projectsStore[projectIndex],
      ...updateData,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    return res.status(200).json({
      success: true,
      project: projectsStore[projectIndex]
    });

  } catch (error) {
    console.error('Project update error:', error);

    res.status(500).json({
      error: true,
      message: 'An error occurred while updating the project',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

export default projectUpdateHandler;