/**
 * Admin Password Reset Request API Endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AdminAuthService } from '../../../../services/AdminAuthService';

const authService = new AdminAuthService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const result = await authService.requestPasswordReset(email);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}