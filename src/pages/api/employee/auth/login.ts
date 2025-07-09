/**
 * Employee Login API Endpoint
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

    const result = await demoAuthService.login(email, password);

    if (!result.success) {
      return res.status(401).json({ 
        success: false, 
        message: result.message 
      });
    }

    // Check if user is employee
    if (result.user?.role !== 'employee') {
      return res.status(403).json({ 
        success: false, 
        message: 'Employee access required' 
      });
    }

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      message: 'Employee login successful'
    });

  } catch (error) {
    console.error('Employee login error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
}