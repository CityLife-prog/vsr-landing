/**
 * Admin Login API Endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { demoAuthService } from '../../../../services/DemoAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Use demo auth service for all admin accounts
    const demoResult = await demoAuthService.login(email, password);
    
    if (demoResult.success && demoResult.user?.role === 'admin') {
      return res.status(200).json({
        success: true,
        token: demoResult.token,
        user: demoResult.user,
        message: 'Admin login successful'
      });
    }

    return res.status(401).json({ 
      success: false, 
      message: 'Invalid admin credentials' 
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
}