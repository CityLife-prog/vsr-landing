/**
 * Maintenance Status API Endpoint
 * Public endpoint to check if maintenance mode is active
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { isMaintenanceModeEnabled, checkServiceStatus } from '../../middleware/maintenanceMode';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const maintenanceConfig = isMaintenanceModeEnabled();
    const serviceStatus = checkServiceStatus();

    return res.status(200).json({
      success: true,
      maintenance: maintenanceConfig,
      serviceRunning: serviceStatus.isRunning,
      modules: serviceStatus.modules,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check maintenance status'
    });
  }
}