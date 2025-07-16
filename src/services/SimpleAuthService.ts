/**
 * Simple Authentication Service for V3
 * Hardcoded admin accounts - no demo functionality
 */

import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { validatePassword } from '../utils/passwordValidation';

interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'employee' | 'client';
  status: 'active';
  phone?: string;
  employeeId?: string;
  projectIds?: string[];
  requiresPasswordReset?: boolean;
  isFirstLogin?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
}

interface LoginResult {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
  requiresPasswordReset?: boolean;
  requiresPasswordChange?: boolean;
}

export class SimpleAuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';
  private readonly USER_DATA_FILE = path.join(process.cwd(), 'data', 'users.json');
  
  // Static user data to maintain state across instances
  private static userData: User[] = [
    // Admin users
    {
      id: 'admin-citylife32',
      email: 'citylife32@outlook.com',
      password: 'VSRDev2025!',
      firstName: 'Matthew',
      lastName: 'Kenner',
      role: 'admin',
      status: 'active',
      requiresPasswordReset: false,
      isFirstLogin: true
    },
    {
      id: 'admin-zach',
      email: 'zach@vsrsnow.com',
      password: 'VSRZach2025!',
      firstName: 'Zach',
      lastName: 'Lewis',
      role: 'admin',
      status: 'active',
      requiresPasswordReset: false,
      isFirstLogin: true
    },
    {
      id: 'admin-marcus',
      email: 'marcus@vsrsnow.com',
      password: 'VSRMarcus2025!',
      firstName: 'Marcus',
      lastName: 'Vargas',
      role: 'admin',
      status: 'active',
      requiresPasswordReset: false,
      isFirstLogin: true
    },
    // Test user for first login detection
    {
      id: 'admin-test-firstlogin',
      email: 'test@vsrsnow.com',
      password: 'TempPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      requiresPasswordReset: false,
      isFirstLogin: true
      // Note: No lastLoginAt field - this will trigger first login detection
    }
    // v2: Admin accounts only - no demo user access
  ];

  constructor() {
    // Load user data on first instantiation
    this.loadUserData();
  }

  // Instance getter for users
  private get users(): User[] {
    return SimpleAuthService.userData;
  }

  /**
   * Load user data from file if it exists (server-side only)
   */
  private loadUserData(): void {
    // Only run on server-side (Node.js environment)
    if (typeof window !== 'undefined') {
      console.log('📂 Client-side detected, skipping file operations');
      return;
    }

    try {
      if (fs.existsSync(this.USER_DATA_FILE)) {
        const data = fs.readFileSync(this.USER_DATA_FILE, 'utf8');
        const loadedUsers = JSON.parse(data);
        console.log('📂 Loading user data from file:', this.USER_DATA_FILE);
        console.log('👥 Loaded users:', loadedUsers.map((u: User) => u.email));
        
        // Convert date strings back to Date objects
        loadedUsers.forEach((user: any) => {
          if (user.passwordResetExpires) {
            user.passwordResetExpires = new Date(user.passwordResetExpires);
          }
          if (user.lastLoginAt) {
            user.lastLoginAt = new Date(user.lastLoginAt);
          }
        });
        
        SimpleAuthService.userData = loadedUsers;
      } else {
        console.log('📂 No user data file found, using default users');
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      console.log('📂 Falling back to default users');
    }
  }

  /**
   * Persist user data to file (server-side only)
   */
  private persistUserData(): void {
    // Only run on server-side (Node.js environment)
    if (typeof window !== 'undefined') {
      console.log('💾 Client-side detected, skipping file operations');
      return;
    }

    try {
      const dataDir = path.dirname(this.USER_DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const data = JSON.stringify(SimpleAuthService.userData, null, 2);
      fs.writeFileSync(this.USER_DATA_FILE, data);
      console.log('💾 User data persisted to file:', this.USER_DATA_FILE);
    } catch (error) {
      console.error('❌ Error persisting user data:', error);
    }
  }

  /**
   * Login with credentials
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<LoginResult> {
    const user = this.users.find(u => u.email === email);
    
    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check password
    if (password !== user.password) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check for first login (if lastLoginAt is undefined, it's first login)
    const isFirstLogin = !user.lastLoginAt;
    
    // Update last login
    user.lastLoginAt = new Date();
    
    // Persist the changes
    this.persistUserData();
    
    const tokenExpiry = rememberMe ? '30d' : '24h';
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      this.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        phone: user.phone,
        employeeId: user.employeeId,
        projectIds: user.projectIds
      },
      message: 'Login successful',
      requiresPasswordReset: user.requiresPasswordReset || false,
      requiresPasswordChange: isFirstLogin || user.isFirstLogin || false
    };
  }

  /**
   * Verify token and get user info
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      const user = this.users.find(u => u.id === decoded.userId);
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        phone: user.phone,
        employeeId: user.employeeId,
        projectIds: user.projectIds
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Change user password (simple in-memory for v3)
   */
  async changePassword(email: string, currentPassword: string | undefined, newPassword: string): Promise<LoginResult> {
    console.log(`🔐 Password change request for: ${email}`);
    console.log(`👤 Current password provided: ${currentPassword ? 'Yes' : 'No'}`);
    
    const user = this.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return {
        success: false,
        message: 'User not found'
      };
    }

    console.log(`📋 Found user: ${user.email}, Current stored password: ${user.password}`);

    // Verify current password (skip if undefined for forced changes)
    if (currentPassword !== undefined && user.password !== currentPassword) {
      console.log(`❌ Current password mismatch for ${email}`);
      console.log(`   Expected: ${user.password}`);
      console.log(`   Provided: ${currentPassword}`);
      return {
        success: false,
        message: 'Current password is incorrect'
      };
    }

    // Comprehensive password validation using new validation system
    const passwordValidation = validatePassword(newPassword);
    
    if (!passwordValidation.isValid) {
      const requiredFailed = passwordValidation.requirements.failed
        .filter(r => r.severity === 'required')
        .map(r => r.description);
      
      return {
        success: false,
        message: `Password does not meet security requirements: ${requiredFailed.join(', ')}`
      };
    }

    // Update password and clear reset/first login flags
    const oldPassword = user.password;
    user.password = newPassword;
    user.requiresPasswordReset = false;
    user.isFirstLogin = false;
    
    console.log(`✅ Password changed for ${email}`);
    console.log(`   Old password: ${oldPassword}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   User object updated in static array`);
    
    // Persist the user data to a file for better persistence
    this.persistUserData();

    // Generate new token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        phone: user.phone,
        employeeId: user.employeeId,
        projectIds: user.projectIds
      },
      message: 'Password changed successfully'
    };
  }

  /**
   * Request password reset via email
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const user = this.users.find(u => u.email === email && u.role === 'admin');
    
    if (!user) {
      // Don't reveal if email exists for security
      return {
        success: true,
        message: 'If your email is registered, you will receive a password reset link.'
      };
    }

    // Generate reset token
    user.passwordResetToken = uuidv4();
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Persist the reset token
    this.persistUserData();

    // Log token for debugging (remove in production)
    console.log(`🔑 Generated reset token for ${email}: ${user.passwordResetToken}`);
    console.log(`⏰ Token expires at: ${user.passwordResetExpires}`);

    // Send reset email
    await this.sendPasswordResetEmail(email, user.passwordResetToken);

    return {
      success: true,
      message: 'Password reset email sent successfully.'
    };
  }

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<LoginResult> {
    console.log('🔍 Reset token lookup - Token provided:', token);
    console.log('📊 Available users with reset tokens:');
    this.users.forEach(u => {
      if (u.passwordResetToken) {
        console.log(`  - Email: ${u.email}, Token: ${u.passwordResetToken}, Expires: ${u.passwordResetExpires}`);
      }
    });

    const user = this.users.find(u => 
      u.passwordResetToken === token && 
      u.passwordResetExpires && 
      u.passwordResetExpires > new Date()
    );

    if (!user) {
      console.log('❌ No matching user found for token');
      console.log('⏰ Current time:', new Date().toISOString());
      return {
        success: false,
        message: 'Invalid or expired reset token.'
      };
    }

    console.log('✅ Found matching user:', user.email);

    // Comprehensive password validation using new validation system
    const passwordValidation = validatePassword(newPassword);
    
    if (!passwordValidation.isValid) {
      const requiredFailed = passwordValidation.requirements.failed
        .filter(r => r.severity === 'required')
        .map(r => r.description);
      
      return {
        success: false,
        message: `Password does not meet security requirements: ${requiredFailed.join(', ')}`
      };
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.requiresPasswordReset = false;
    user.isFirstLogin = false;

    // Persist the changes
    this.persistUserData();

    const token_jwt = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      token: token_jwt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      },
      message: 'Password reset successfully.'
    };
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    console.log('🔐 Starting password reset email process...');
    console.log('📧 Email From:', process.env.EMAIL_FROM);
    console.log('🔑 Email Pass configured:', !!process.env.EMAIL_PASS);
    console.log('🌐 Reset URL base:', process.env.NEXTAUTH_URL);
    
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_FROM,
          pass: process.env.EMAIL_PASS
        },
        debug: true, // Enable debug logs
        logger: true // Enable logger
      });

      console.log('📮 Transporter created successfully');
      
      // Test the connection
      try {
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');
      } catch (verifyError) {
        console.error('❌ SMTP connection verification failed:', verifyError);
        throw verifyError;
      }

      const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/admin/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'VSR Admin Password Reset',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            
            <p>Hello,</p>
            
            <p>You requested a password reset for your VSR admin account.</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>📧 Important Email Delivery Notice:</strong></p>
              <ul>
                <li><strong>Check your junk/spam folder</strong> if you don't see this email</li>
                <li><strong>Add contact@vsrsnow.com to your safe senders list</strong> to ensure future delivery</li>
                <li>This helps prevent important VSR emails from being filtered</li>
              </ul>
            </div>
            
            <p>
              <a href="${resetUrl}" 
                 style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </p>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Security Information:</strong></p>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this reset, ignore this email</li>
                <li>Your account will remain secure</li>
              </ul>
            </div>
            
            <p>Best regards,<br>VSR Security Team</p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              For support, contact us at contact@vsrsnow.com
            </p>
          </div>
        `
      };

      console.log('📧 Attempting to send email to:', email);
      console.log('🔗 Reset URL:', resetUrl);
      
      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent successfully to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${email}:`, error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(currentEmail: string, updates: { firstName: string; lastName: string; email: string }): Promise<boolean> {
    if (typeof window !== 'undefined') return false;

    // Find the user
    const user = this.users.find(u => u.email === currentEmail);
    if (!user) {
      return false;
    }

    // Check if new email is already taken by another user
    if (updates.email !== currentEmail) {
      const existingUser = this.users.find(u => u.email === updates.email && u.id !== user.id);
      if (existingUser) {
        return false;
      }
    }

    // Update the user
    user.firstName = updates.firstName;
    user.lastName = updates.lastName;
    user.email = updates.email;

    // Persist changes
    this.persistUserData();

    return true;
  }
}

// Export singleton instance
export const simpleAuthService = new SimpleAuthService();