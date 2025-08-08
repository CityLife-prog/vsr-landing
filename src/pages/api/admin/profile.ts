/**
 * Admin Profile Management API Endpoint
 * Handles profile updates including display name, password change, and photo upload
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '../../../services/SimpleAuthService';
import { secureCookieManager } from '../../../lib/secure-cookie-auth';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${req.body.userId || Date.now()}${ext}`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware to handle multipart/form-data
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Authenticate user
    const authResult = await secureCookieManager.getAuthFromCookies(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = authResult.user;

    if (req.method === 'GET') {
      // Get user profile - need to get full user data from secure user manager
      const { secureUserManager } = await import('../../../lib/secure-user-manager');
      const fullUser = secureUserManager.getUserById(user.id);
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: fullUser.id,
          email: fullUser.email,
          firstName: fullUser.firstName,
          lastName: fullUser.lastName,
          role: fullUser.role,
          phone: fullUser.phone || null,
          profilePhoto: fullUser.profilePhoto || null,
          lastLoginAt: fullUser.lastLoginAt,
          createdAt: fullUser.createdAt
        }
      });

    } else if (req.method === 'PUT') {
      // Update profile information
      const { firstName, lastName, phone, currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
      }

      let result = { success: true, message: 'Profile updated successfully', user: null };

      // If password change is requested
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Current password is required to change password'
          });
        }

        const passwordChangeResult = await simpleAuthService.changePassword(
          user.email,
          currentPassword,
          newPassword
        );

        if (!passwordChangeResult.success) {
          return res.status(400).json({
            success: false,
            message: passwordChangeResult.message
          });
        }

        result.user = passwordChangeResult.user;
        result.message = 'Profile and password updated successfully';
      }

      // Update profile in secure user manager
      const { secureUserManager } = await import('../../../lib/secure-user-manager');
      const updateResult = secureUserManager.updateUser(user.id, {
        firstName,
        lastName,
        phone
      });

      if (!updateResult.success) {
        return res.status(400).json({
          success: false,
          message: updateResult.message || 'Failed to update profile'
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        user: result.user || updateResult.user
      });

    } else if (req.method === 'POST') {
      // Handle file upload for profile photo
      try {
        await runMiddleware(req, res, upload.single('profilePhoto'));

        const file = (req as any).file;
        if (!file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded'
          });
        }

        const photoUrl = `/uploads/profiles/${file.filename}`;

        // Update user profile photo in secure user manager
        const { secureUserManager } = await import('../../../lib/secure-user-manager');
        const updateResult = secureUserManager.updateUser(user.id, {
          profilePhoto: photoUrl
        });

        if (!updateResult.success) {
          return res.status(400).json({
            success: false,
            message: 'Failed to update profile photo in database'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Profile photo updated successfully',
          profilePhoto: photoUrl
        });

      } catch (error) {
        console.error('File upload error:', error);
        return res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'File upload failed'
        });
      }

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Profile operation failed due to server error'
    });
  }
}

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};