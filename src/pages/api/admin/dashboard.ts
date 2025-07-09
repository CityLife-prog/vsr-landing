/**
 * Admin Dashboard API Endpoint
 * Provide dashboard statistics and system health information
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { demoAuthService } from '../../../services/DemoAuthService';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify token using demo auth service
    const user = await demoAuthService.verifyToken(token);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    switch (method) {
      case 'GET':
        // Return demo dashboard statistics
        const stats = {
          totalUsers: 156,
          totalEmployees: 89,
          activeProjects: 23,
          pendingApprovals: 7,
          systemHealth: 'good',
          recentActivity: [
            { action: 'User registration', user: 'john.doe@example.com', timestamp: new Date().toISOString() },
            { action: 'Project updated', user: 'jane.smith@example.com', timestamp: new Date().toISOString() },
            { action: 'Employee approved', user: 'mike.wilson@example.com', timestamp: new Date().toISOString() }
          ]
        };
        
        return res.status(200).json({
          admin: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          stats: stats
        });

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}