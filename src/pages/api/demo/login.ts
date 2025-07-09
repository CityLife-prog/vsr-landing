// Demo Login API Endpoint
// WARNING: DELETE before production

import { NextApiRequest, NextApiResponse } from 'next';
import { demoAuthService } from '@/services/DemoAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { role, email, password } = req.body;

    let result;
    
    // One-click demo login
    if (role && !email && !password) {
      result = await demoAuthService.demoLogin(role);
    } 
    // Regular login
    else if (email && password) {
      result = await demoAuthService.login(email, password);
    } 
    else {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}