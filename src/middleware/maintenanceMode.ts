/**
 * Maintenance Mode Middleware
 * Blocks access to the application when maintenance mode is enabled
 */

import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  enabledAt: string;
  enabledBy: string;
}

const MAINTENANCE_FILE = path.join(process.cwd(), 'data', 'maintenance.json');

export function isMaintenanceModeEnabled(): MaintenanceConfig | null {
  try {
    if (fs.existsSync(MAINTENANCE_FILE)) {
      const data = fs.readFileSync(MAINTENANCE_FILE, 'utf8');
      const config = JSON.parse(data);
      return config.enabled ? config : null;
    }
  } catch (error) {
    console.error('Error reading maintenance config:', error);
  }
  return null;
}

export function withMaintenanceMode(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Skip maintenance mode for admin endpoints
    if (req.url?.includes('/api/admin/')) {
      return handler(req, res);
    }

    // Check if maintenance mode is enabled
    const maintenanceConfig = isMaintenanceModeEnabled();
    
    if (maintenanceConfig) {
      console.log('🚧 Request blocked by maintenance mode:', req.url);
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: maintenanceConfig.message,
        maintenanceMode: true,
        enabledAt: maintenanceConfig.enabledAt,
        retryAfter: 3600 // 1 hour
      });
    }

    return handler(req, res);
  };
}

// Service status check for middleware
export function checkServiceStatus(): { isRunning: boolean; modules: any } {
  try {
    const statusFile = path.join(process.cwd(), 'data', 'service-status.json');
    if (fs.existsSync(statusFile)) {
      const data = fs.readFileSync(statusFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading service status:', error);
  }
  
  // Default to running if file doesn't exist
  return { 
    isRunning: true, 
    modules: {
      analytics: true,
      dashboard: true,
      userManagement: true,
      projectTracker: true,
      emailService: true,
      authentication: true
    }
  };
}

export function withServiceStatusCheck(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  requiredModule?: string
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const serviceStatus = checkServiceStatus();
    
    // If service is not running, enable maintenance mode behavior
    if (!serviceStatus.isRunning) {
      console.log('🛑 Request blocked - service stopped:', req.url);
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'System is currently offline for maintenance. Please try again later.',
        serviceRunning: false
      });
    }
    
    // If specific module is required and it's disabled
    if (requiredModule && !serviceStatus.modules[requiredModule]) {
      console.log(`🚫 Request blocked - ${requiredModule} module disabled:`, req.url);
      return res.status(503).json({
        success: false,
        error: 'Module Unavailable',
        message: `The ${requiredModule} service is currently unavailable.`,
        moduleDisabled: requiredModule
      });
    }
    
    return handler(req, res);
  };
}