import type { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '@/services/SimpleAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { currentEmail, firstName, lastName, email } = req.body;

    if (!currentEmail || !firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Update user profile
    const success = await simpleAuthService.updateUserProfile(currentEmail, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim()
    });

    if (success) {
      res.status(200).json({ 
        success: true, 
        message: 'Profile updated successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Failed to update profile' 
      });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}