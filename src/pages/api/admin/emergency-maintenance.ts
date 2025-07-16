/**
 * Emergency Maintenance API Endpoint - Super Admin Only
 * The "Big Red Button" for immediate site shutdown
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withSecurity } from '../../../middleware/cors';
import * as fs from 'fs';
import * as path from 'path';
import jwt from 'jsonwebtoken';

interface EmergencyMaintenanceRequest {
  action: 'enable' | 'disable';
  reason?: string;
  estimatedDuration?: string;
}

const MAINTENANCE_FILE = path.join(process.cwd(), 'data', 'maintenance.json');
const SERVICE_STATUS_FILE = path.join(process.cwd(), 'data', 'service-status.json');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Super admin authentication check
  let decoded: any;
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authorization required.',
        error: 'NO_AUTH_HEADER'
      });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if user is the super admin
    if (!decoded.email || decoded.email !== 'citylife32@outlook.com') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

  } catch (error) {
    console.error('❌ Emergency maintenance auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }

  if (req.method === 'POST') {
    const { action, reason, estimatedDuration }: EmergencyMaintenanceRequest = req.body;

    try {
      if (action === 'enable') {
        console.log('🚨 EMERGENCY MAINTENANCE ACTIVATED by:', decoded.email);
        
        // Create emergency maintenance mode
        const maintenanceData = {
          enabled: true,
          message: reason || 'Emergency maintenance in progress. We apologize for the inconvenience and will be back online shortly.',
          enabledAt: new Date().toISOString(),
          enabledBy: decoded.email,
          isEmergency: true,
          estimatedDuration: estimatedDuration || 'Unknown',
          reason: reason || 'Emergency maintenance'
        };

        // Ensure data directory exists
        const dataDir = path.dirname(MAINTENANCE_FILE);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        // Enable maintenance mode
        fs.writeFileSync(MAINTENANCE_FILE, JSON.stringify(maintenanceData, null, 2));

        // Also disable all services for maximum effect
        const serviceStatus = {
          isRunning: false,
          modules: {
            analytics: false,
            dashboard: false,
            userManagement: false,
            projectTracker: false,
            emailService: false,
            authentication: false
          },
          lastUpdated: new Date().toISOString(),
          updatedBy: decoded.email,
          emergencyShutdown: true,
          adminNotes: {
            emergency: {
              message: 'EMERGENCY SHUTDOWN: All services disabled for emergency maintenance',
              disabledAt: new Date().toISOString(),
              disabledBy: decoded.email,
              reason: reason || 'Emergency maintenance'
            }
          }
        };

        const serviceDataDir = path.dirname(SERVICE_STATUS_FILE);
        if (!fs.existsSync(serviceDataDir)) {
          fs.mkdirSync(serviceDataDir, { recursive: true });
        }
        
        fs.writeFileSync(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));

        console.log('🚨 EMERGENCY MAINTENANCE MODE ENABLED');
        console.log('📋 Reason:', reason || 'Not specified');
        console.log('⏱️ Estimated Duration:', estimatedDuration || 'Unknown');

        return res.status(200).json({
          success: true,
          message: 'Emergency maintenance mode activated successfully',
          data: {
            maintenanceMode: maintenanceData,
            serviceStatus: serviceStatus
          }
        });

      } else if (action === 'disable') {
        console.log('✅ EMERGENCY MAINTENANCE DEACTIVATED by:', decoded.email);
        
        // Remove maintenance mode
        if (fs.existsSync(MAINTENANCE_FILE)) {
          fs.unlinkSync(MAINTENANCE_FILE);
        }

        // Restore all services
        const serviceStatus = {
          isRunning: true,
          modules: {
            analytics: true,
            dashboard: true,
            userManagement: true,
            projectTracker: true,
            emailService: true,
            authentication: true
          },
          lastUpdated: new Date().toISOString(),
          updatedBy: decoded.email,
          emergencyShutdown: false
        };

        fs.writeFileSync(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));

        console.log('✅ EMERGENCY MAINTENANCE MODE DISABLED - ALL SERVICES RESTORED');

        return res.status(200).json({
          success: true,
          message: 'Emergency maintenance mode deactivated successfully',
          data: {
            serviceStatus: serviceStatus
          }
        });

      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be "enable" or "disable"',
          error: 'INVALID_ACTION'
        });
      }

    } catch (error) {
      console.error('❌ Emergency maintenance error:', error);
      
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error during emergency maintenance operation',
        error: 'SERVER_ERROR'
      });
    }
  }

  if (req.method === 'GET') {
    // Get current emergency maintenance status
    try {
      let maintenanceData = null;
      if (fs.existsSync(MAINTENANCE_FILE)) {
        const data = fs.readFileSync(MAINTENANCE_FILE, 'utf8');
        maintenanceData = JSON.parse(data);
      }

      let serviceStatus = null;
      if (fs.existsSync(SERVICE_STATUS_FILE)) {
        const data = fs.readFileSync(SERVICE_STATUS_FILE, 'utf8');
        serviceStatus = JSON.parse(data);
      }

      return res.status(200).json({
        success: true,
        data: {
          maintenanceMode: maintenanceData,
          serviceStatus: serviceStatus,
          isEmergencyActive: !!(maintenanceData?.isEmergency)
        }
      });

    } catch (error) {
      console.error('❌ Error getting emergency maintenance status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get emergency maintenance status',
        error: 'SERVER_ERROR'
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ 
    success: false,
    message: 'Method not allowed',
    error: 'METHOD_NOT_ALLOWED'
  });
}

export default withSecurity(handler);