/**
 * Admin Change Password API Endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AdminAuthService } from '../../../../services/AdminAuthService';

const authService = new AdminAuthService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    const result = await authService.changePassword(email, currentPassword, newPassword);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}