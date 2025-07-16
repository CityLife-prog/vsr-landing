/**
 * Stop Service API Endpoint - Super Admin Only
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../middleware/withAdminAuth';
import { withSecurity } from '../../../middleware/cors';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed',
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Get admin user from auth middleware
    const adminUser = (req as any).user;
    
    // Check if user is the super admin
    if (!adminUser || adminUser.email !== 'citylife32@outlook.com') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { confirmText } = req.body;

    // Require confirmation text
    if (confirmText !== 'STOP SERVICE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation text. Type "STOP SERVICE" to confirm.',
        error: 'INVALID_CONFIRMATION'
      });
    }

    // Log the shutdown request
    console.log('🚨 SERVICE SHUTDOWN REQUESTED');
    console.log(`👤 Requested by: ${adminUser.email} (${adminUser.firstName} ${adminUser.lastName})`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`🖥️  IP Address: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`);

    // Send success response before shutdown
    res.status(200).json({
      success: true,
      message: 'Service shutdown initiated. Server will stop in 3 seconds.',
      shutdownTime: new Date(Date.now() + 3000).toISOString()
    });

    // Shutdown the service after a short delay
    setTimeout(() => {
      console.log('🔴 SHUTTING DOWN SERVICE...');
      console.log('👋 Goodbye!');
      process.exit(0);
    }, 3000);

  } catch (error) {
    console.error('Stop service error:', error);
    
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
}

export default withAdminAuth(withSecurity(handler));