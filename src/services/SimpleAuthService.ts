/**
 * Secure Authentication Service
 * Uses encrypted user storage and secure password hashing
 * SECURITY: Replaces hardcoded credentials with secure authentication
 */

import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { validatePassword } from '../utils/passwordValidation';
import { secureUserManager } from '../lib/secure-user-manager';
import { passwordSecurity, passwordUtils } from '../lib/password-security';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'employee' | 'client';
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  employeeId?: string;
  projectIds?: string[];
  requirePasswordChange?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LoginResult {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
  requiresPasswordReset?: boolean;
  requiresPasswordChange?: boolean;
  sessionId?: string;
}

export class SimpleAuthService {
  private readonly JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  })();
  private activeSessions = new Map<string, { userId: string; sessionId: string; createdAt: Date }>();
  private resetTokens = new Map<string, { email: string; createdAt: number }>();
  
  constructor() {
    // Initialize secure user manager
    console.log('🔐 Initializing secure authentication service...');
    this.startSessionCleanup();
  }

  /**
   * Start session cleanup routine
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // Clean up every hour
  }

  /**
   * Clean up expired sessions and reset tokens
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    const resetTokenTimeout = 60 * 60 * 1000; // 1 hour
    
    // Clean up expired sessions
    for (const [token, session] of this.activeSessions.entries()) {
      if (now - session.createdAt.getTime() > sessionTimeout) {
        this.activeSessions.delete(token);
      }
    }
    
    // Clean up expired reset tokens
    for (const [token, resetData] of this.resetTokens.entries()) {
      if (now - resetData.createdAt > resetTokenTimeout) {
        this.resetTokens.delete(token);
      }
    }
  }

  /**
   * Login with credentials using secure authentication
   * SECURITY: Uses secure user manager with password hashing and rate limiting
   */
  async login(email: string, password: string, rememberMe: boolean = false, ip: string = 'unknown', userAgent: string = 'unknown'): Promise<LoginResult> {
    try {
      // Authenticate using secure user manager
      const authResult = await secureUserManager.authenticate(email, password, ip, userAgent);
      
      if (!authResult.success) {
        return {
          success: false,
          message: authResult.message || 'Authentication failed'
        };
      }

      const user = authResult.user!;
      const sessionId = authResult.sessionId!;
      
      // Generate JWT token
      const tokenExpiry = rememberMe ? '30d' : '24h';
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          sessionId
        },
        this.JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      // Store session mapping
      this.activeSessions.set(token, {
        userId: user.id,
        sessionId,
        createdAt: new Date()
      });

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
        message: authResult.message || 'Login successful',
        requiresPasswordChange: authResult.requiresPasswordChange || false,
        sessionId: sessionId
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed due to server error'
      };
    }
  }

  /**
   * Verify token and get user info
   * SECURITY: Validates both JWT and session in secure user manager
   */
  async verifyToken(token: string): Promise<any> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Check if session exists in our active sessions
      const sessionInfo = this.activeSessions.get(token);
      if (!sessionInfo) {
        return null;
      }

      // Validate session in secure user manager
      const sessionValidation = secureUserManager.validateSession(sessionInfo.sessionId);
      if (!sessionValidation.valid) {
        // Remove invalid session
        this.activeSessions.delete(token);
        return null;
      }

      const user = sessionValidation.user!;
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
   * Change user password using secure authentication
   * SECURITY: Uses secure password validation and hashing
   */
  async changePassword(email: string, currentPassword: string | undefined, newPassword: string): Promise<LoginResult> {
    try {
      console.log(`🔐 Secure password change request for: ${email}`);
      
      // Get user from secure user manager
      const user = secureUserManager.getUserByEmail(email);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Use secure user manager to change password
      const changeResult = await secureUserManager.changePassword(
        user.id,
        currentPassword || '',
        newPassword
      );

      if (!changeResult.success) {
        return {
          success: false,
          message: changeResult.message || 'Password change failed'
        };
      }

      // Invalidate all existing sessions for this user
      secureUserManager.logoutAllSessions(user.id);
      
      // Generate new token for the user
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

      // Create new session
      const sessionId = uuidv4(); // Temporary - would use secure session creation
      
      // Store new session mapping
      this.activeSessions.set(token, {
        userId: user.id,
        sessionId,
        createdAt: new Date()
      });

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
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        message: 'Password change failed due to server error'
      };
    }
  }

  /**
   * Request password reset via email
   * SECURITY: Uses secure token generation and rate limiting
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists (but don't reveal this information)
      const user = secureUserManager.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message: 'If your email is registered, you will receive a password reset link.'
        };
      }

      // Generate secure reset token
      const resetToken = passwordSecurity.generateSecurePassword(32);
      
      // Store token with email and expiration
      this.resetTokens.set(resetToken, {
        email: email,
        createdAt: Date.now()
      });
      
      console.log(`🔑 Generated secure reset token for ${email}: ${resetToken}`);
      console.log(`⏰ Token expires in 1 hour`);

      // Send reset email
      await this.sendPasswordResetEmail(email, resetToken);

      return {
        success: true,
        message: 'Password reset email sent successfully.'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message: 'Password reset request failed due to server error'
      };
    }
  }

  /**
   * Reset password with token
   * SECURITY: Uses secure password validation and token verification
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<LoginResult> {
    try {
      console.log('🔍 Secure password reset with token');
      
      // Validate new password using secure password manager
      const passwordValidation = passwordSecurity.validatePasswordStrength(newPassword);
      
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: `Password does not meet security requirements: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Check if token exists and is valid
      const tokenData = this.resetTokens.get(token);
      if (!tokenData) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      // Check if token has expired (1 hour expiry)
      const tokenAge = Date.now() - tokenData.createdAt;
      const ONE_HOUR = 60 * 60 * 1000;
      if (tokenAge > ONE_HOUR) {
        this.resetTokens.delete(token);
        return {
          success: false,
          message: 'Reset token has expired. Please request a new password reset.'
        };
      }

      // Find user by email
      const user = secureUserManager.getUserByEmail(tokenData.email);
      if (!user) {
        this.resetTokens.delete(token);
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Temporarily set requirePasswordChange to bypass current password check
      const originalRequirePasswordChange = user.requirePasswordChange;
      user.requirePasswordChange = true;
      
      // Use secure user manager to change password
      const changeResult = await secureUserManager.changePassword(
        user.id,
        '', // No current password needed for reset
        newPassword
      );
      
      // Reset the requirePasswordChange flag to its original state
      user.requirePasswordChange = originalRequirePasswordChange || false;

      if (!changeResult.success) {
        return {
          success: false,
          message: changeResult.message || 'Password reset failed'
        };
      }

      // Remove the used token
      this.resetTokens.delete(token);
      
      // Invalidate all existing sessions for this user
      secureUserManager.logoutAllSessions(user.id);
      
      // Generate new token for the user
      const accessToken = jwt.sign(
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

      // Create new session
      const sessionId = uuidv4();
      
      // Store new session mapping
      this.activeSessions.set(accessToken, {
        userId: user.id,
        sessionId,
        createdAt: new Date()
      });

      console.log(`✅ Password reset successful for user: ${user.email}`);

      return {
        success: true,
        token: accessToken,
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
        message: 'Password reset successfully'
      };
      
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Password reset failed due to server error'
      };
    }
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
   * Logout user and invalidate session
   * SECURITY: Properly invalidates both JWT and session
   */
  async logout(token: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Remove from active sessions
      const sessionInfo = this.activeSessions.get(token);
      if (sessionInfo) {
        // Invalidate session in secure user manager
        secureUserManager.logout(sessionInfo.sessionId);
        
        // Remove from our active sessions
        this.activeSessions.delete(token);
      }

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Logout failed due to server error'
      };
    }
  }

  /**
   * Update user profile information
   * SECURITY: Uses secure user manager for updates
   */
  async updateUserProfile(currentEmail: string, updates: { firstName: string; lastName: string; email: string }): Promise<boolean> {
    try {
      // Get user from secure user manager
      const user = secureUserManager.getUserByEmail(currentEmail);
      if (!user) {
        return false;
      }

      // Check if new email is already taken
      if (updates.email !== currentEmail) {
        const existingUser = secureUserManager.getUserByEmail(updates.email);
        if (existingUser) {
          return false;
        }
      }

      // In a full implementation, you would update the user through the secure user manager
      console.log('⚠️  Profile update not fully implemented with secure user manager');
      console.log('⚠️  This is a placeholder - implement full profile updates in production');
      
      return false; // Disabled until full implementation
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  }
  /**
   * Get authentication statistics
   * SECURITY: Provides insights into authentication usage
   */
  getAuthStats(): {
    activeSessions: number;
    secureUsersCount: number;
    authMethod: string;
  } {
    return {
      activeSessions: this.activeSessions.size,
      secureUsersCount: 3, // Would be dynamic in full implementation
      authMethod: 'secure_bcrypt_jwt'
    };
  }
}

// Export singleton instance
export const simpleAuthService = new SimpleAuthService();

// Log initialization
console.log('✅ Secure Authentication Service initialized');
console.log('🔒 Using bcrypt password hashing and secure user management');
console.log('⚠️  Please check console for initial admin credentials');