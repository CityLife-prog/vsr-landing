// Employee Dashboard API
import { NextApiRequest, NextApiResponse } from 'next';
import { demoAuthService } from '@/services/DemoAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const user = await demoAuthService.verifyToken(token);
    
    if (!user || user.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({
      success: true,
      employee: user,
      message: 'Employee dashboard data loaded'
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}