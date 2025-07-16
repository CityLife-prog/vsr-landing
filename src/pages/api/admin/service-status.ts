/**
 * Service Status API Endpoint - Super Admin Only
 * Toggle service status and manage module states
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withSecurity } from '../../../middleware/cors';
import * as fs from 'fs';
import * as path from 'path';
import jwt from 'jsonwebtoken';

interface ServiceStatus {
  isRunning: boolean;
  modules: {
    analytics: boolean;
    dashboard: boolean;
    userManagement: boolean;
    projectTracker: boolean;
    emailService: boolean;
    authentication: boolean;
  };
  lastUpdated: string;
  updatedBy: string;
  adminNotes?: {
    analytics?: {
      message: string;
      disabledAt: string;
      disabledBy: string;
      reason?: string;
    };
  };
}

const STATUS_FILE = path.join(process.cwd(), 'data', 'service-status.json');

// Initialize default status
const defaultStatus: ServiceStatus = {
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
  updatedBy: 'system'
};

function getServiceStatus(): ServiceStatus {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = fs.readFileSync(STATUS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading service status:', error);
  }
  return defaultStatus;
}

function saveServiceStatus(status: ServiceStatus): void {
  try {
    const dataDir = path.dirname(STATUS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    console.log('💾 Service status saved:', status);
  } catch (error) {
    console.error('Error saving service status:', error);
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Simple JWT verification for super admin access only
  let decoded: any;
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Service status: Missing authorization header');
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
      console.log('🔑 Service status: Token decoded:', { email: decoded.email, exp: decoded.exp });
    } catch (jwtError) {
      console.log('❌ Service status: JWT verification failed:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if user is the super admin (simple email check)
    if (!decoded.email || decoded.email !== 'citylife32@outlook.com') {
      console.log('❌ Service status: Not super admin:', decoded.email);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    console.log('✅ Service status: Super admin access granted:', decoded.email);
  } catch (error) {
    console.error('❌ Service status auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }

  if (req.method === 'GET') {
    console.log('📊 Service status requested by:', decoded.email);
    // Get current service status
    const status = getServiceStatus();
    console.log('📊 Returning service status:', status);
    return res.status(200).json({
      success: true,
      data: status
    });
  }

  if (req.method === 'POST') {
    const { action, module } = req.body;

    try {
      const currentStatus = getServiceStatus();

      if (action === 'toggle_service') {
        // Toggle entire service and implement actual control
        const wasRunning = currentStatus.isRunning;
        currentStatus.isRunning = !currentStatus.isRunning;
        currentStatus.lastUpdated = new Date().toISOString();
        currentStatus.updatedBy = decoded.email;

        // If stopping service, disable all modules and enable maintenance mode
        if (!currentStatus.isRunning) {
          console.log('🛑 STOPPING ALL SERVICES - Enabling maintenance mode');
          
          // Disable all modules
          Object.keys(currentStatus.modules).forEach(key => {
            currentStatus.modules[key as keyof typeof currentStatus.modules] = false;
          });
          
          // Create maintenance mode indicator
          try {
            const maintenanceFile = path.join(process.cwd(), 'data', 'maintenance.json');
            const maintenanceData = {
              enabled: true,
              message: 'System temporarily offline for maintenance. Please check back soon.',
              enabledAt: new Date().toISOString(),
              enabledBy: decoded.email
            };
            fs.writeFileSync(maintenanceFile, JSON.stringify(maintenanceData, null, 2));
            console.log('🚧 Maintenance mode ENABLED');
          } catch (error) {
            console.error('Failed to enable maintenance mode:', error);
          }
          
        } else {
          console.log('✅ STARTING ALL SERVICES - Disabling maintenance mode');
          
          // Enable all modules
          Object.keys(currentStatus.modules).forEach(key => {
            currentStatus.modules[key as keyof typeof currentStatus.modules] = true;
          });
          
          // Remove maintenance mode
          try {
            const maintenanceFile = path.join(process.cwd(), 'data', 'maintenance.json');
            if (fs.existsSync(maintenanceFile)) {
              fs.unlinkSync(maintenanceFile);
              console.log('🟢 Maintenance mode DISABLED');
            }
          } catch (error) {
            console.error('Failed to disable maintenance mode:', error);
          }
        }

        saveServiceStatus(currentStatus);

        const statusText = currentStatus.isRunning ? 'STARTED' : 'STOPPED';
        const maintenanceText = currentStatus.isRunning ? 'DISABLED' : 'ENABLED';
        
        console.log(`🔄 Service ${statusText} and maintenance mode ${maintenanceText} by ${decoded.email}`);

        return res.status(200).json({
          success: true,
          message: `Service ${currentStatus.isRunning ? 'started' : 'stopped'} successfully. Maintenance mode ${maintenanceText.toLowerCase()}.`,
          data: currentStatus,
          maintenanceMode: !currentStatus.isRunning
        });
      }

      if (action === 'toggle_module' && module) {
        // Toggle specific module
        if (module in currentStatus.modules) {
          const isCurrentlyEnabled = currentStatus.modules[module as keyof typeof currentStatus.modules];
          currentStatus.modules[module as keyof typeof currentStatus.modules] = !isCurrentlyEnabled;
          currentStatus.lastUpdated = new Date().toISOString();
          currentStatus.updatedBy = decoded.email;

          // Handle analytics-specific admin notes
          if (module === 'analytics') {
            if (!currentStatus.adminNotes) {
              currentStatus.adminNotes = {};
            }

            if (!isCurrentlyEnabled) {
              // Analytics is being enabled - clear the note
              delete currentStatus.adminNotes.analytics;
            } else {
              // Analytics is being disabled - add admin note
              const { reason } = req.body;
              currentStatus.adminNotes.analytics = {
                message: 'Analytics system has been temporarily disabled by super admin',
                disabledAt: new Date().toISOString(),
                disabledBy: decoded.email,
                reason: reason || 'Manual administrative action'
              };
            }
          }

          saveServiceStatus(currentStatus);

          console.log(`🔄 Module ${module} ${currentStatus.modules[module as keyof typeof currentStatus.modules] ? 'ENABLED' : 'DISABLED'} by ${decoded.email}`);

          return res.status(200).json({
            success: true,
            message: `Module ${module} ${currentStatus.modules[module as keyof typeof currentStatus.modules] ? 'enabled' : 'disabled'} successfully`,
            data: currentStatus
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Invalid module name',
            error: 'INVALID_MODULE'
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid action',
        error: 'INVALID_ACTION'
      });

    } catch (error) {
      console.error('Service status error:', error);
      
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error',
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