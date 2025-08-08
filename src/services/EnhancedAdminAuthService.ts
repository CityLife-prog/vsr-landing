/**
 * Enhanced Admin Authentication Service
 * Handles admin login with email verification and password reset flow
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { AdminUser, DEFAULT_ADMIN_USERS } from '../types/admin';
import { envConfig } from '../lib/env-validation';

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: AdminUser;
  message: string;
  requiresPasswordReset?: boolean;
  passwordResetToken?: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  resetToken?: string;
}

export class EnhancedAdminAuthService {
  private adminUsers: Map<string, AdminUser> = new Map();
  private passwordResetTokens: Map<string, { email: string; expires: Date }> = new Map();
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.initializeEmailTransporter();
    this.initializeDefaultAdmins();
  }

  private initializeEmailTransporter(): void {
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: envConfig.EMAIL_FROM,
        pass: envConfig.EMAIL_PASS
      }
    });
  }

  private async initializeDefaultAdmins(): Promise<void> {
    for (const adminConfig of DEFAULT_ADMIN_USERS) {
      // Generate secure random password for each admin
      const temporaryPassword = this.generateSecurePassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
      
      const admin: AdminUser = {
        id: this.generateId(),
        email: adminConfig.email,
        firstName: adminConfig.firstName,
        lastName: adminConfig.lastName,
        adminLevel: adminConfig.adminLevel,
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [],
        permissions: [],
        managementPermissions: [],
        canManageUsers: adminConfig.adminLevel === 'super_admin' || adminConfig.adminLevel === 'admin',
        canManageEmployees: true,
        canAccessTraining: true,
        canViewReports: adminConfig.adminLevel !== 'manager',
        canManageSystem: adminConfig.adminLevel === 'super_admin',
        requiresPasswordReset: adminConfig.requiresPasswordReset,
        metadata: {
          isDefaultAdmin: true,
          adminLevel: adminConfig.adminLevel,
          permissions: adminConfig.permissions
        }
      };

      // Store hashed password in metadata for demo purposes
      admin.metadata = {
        ...admin.metadata,
        hashedPassword
      };

      this.adminUsers.set(admin.email, admin);
    }

    console.log(`✅ Initialized ${DEFAULT_ADMIN_USERS.length} admin accounts`);
  }

  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const admin = this.adminUsers.get(email.toLowerCase());
      
      if (!admin) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      if (!admin.isActive) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Verify password
      const storedPassword = admin.metadata?.hashedPassword as string;
      if (!storedPassword) {
        return {
          success: false,
          message: 'Account configuration error'
        };
      }

      const isValidPassword = await bcrypt.compare(password, storedPassword);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Check if password reset is required
      if (admin.requiresPasswordReset) {
        const resetToken = await this.generatePasswordResetToken(email);
        await this.sendPasswordResetEmail(admin, resetToken);
        
        return {
          success: true,
          message: 'Password reset required. Check your email for reset instructions.',
          requiresPasswordReset: true,
          passwordResetToken: resetToken,
          user: this.sanitizeUser(admin)
        };
      }

      // Generate JWT token
      const token = this.generateJWT(admin);

      // Update last login
      admin.lastLoginAt = new Date();
      admin.updatedAt = new Date();

      return {
        success: true,
        token,
        user: this.sanitizeUser(admin),
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    this.passwordResetTokens.set(token, { email, expires });

    // Also store in user record
    const admin = this.adminUsers.get(email.toLowerCase());
    if (admin) {
      admin.passwordResetToken = token;
      admin.passwordResetExpires = expires;
      admin.updatedAt = new Date();
    }

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<PasswordResetResult> {
    try {
      const tokenData = this.passwordResetTokens.get(token);
      
      if (!tokenData || tokenData.expires < new Date()) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      const admin = this.adminUsers.get(tokenData.email.toLowerCase());
      if (!admin) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Validate new password
      if (newPassword.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long'
        };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user
      admin.metadata = {
        ...admin.metadata,
        hashedPassword
      };
      admin.requiresPasswordReset = false;
      admin.passwordResetToken = undefined;
      admin.passwordResetExpires = undefined;
      admin.updatedAt = new Date();

      // Remove token
      this.passwordResetTokens.delete(token);

      console.log(`✅ Password reset successful for ${admin.email}`);

      return {
        success: true,
        message: 'Password reset successful'
      };

    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    try {
      const admin = this.adminUsers.get(email.toLowerCase());
      
      if (!admin) {
        // Don't reveal if email exists
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent'
        };
      }

      const resetToken = await this.generatePasswordResetToken(email);
      await this.sendPasswordResetEmail(admin, resetToken);

      return {
        success: true,
        message: 'Password reset email sent',
        resetToken
      };

    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message: 'Failed to send reset email'
      };
    }
  }

  private async sendPasswordResetEmail(admin: AdminUser, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: envConfig.EMAIL_FROM,
      to: admin.email,
      subject: 'VSR Admin - Password Reset Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Password Reset Required</h2>
          
          <p>Hello ${admin.firstName},</p>
          
          <p>Your admin account requires a password reset. This is required for first-time login or when requested.</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Account Details:</strong></p>
            <ul>
              <li>Email: ${admin.email}</li>
              <li>Admin Level: ${admin.adminLevel}</li>
              <li>Reset Required: ${admin.requiresPasswordReset ? 'Yes' : 'No'}</li>
            </ul>
          </div>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #6b7280; font-size: 14px;">
              This reset link will expire in 24 hours. If you didn't request this reset, please contact your system administrator.
            </p>
            <p style="color: #6b7280; font-size: 12px;">
              VSR Construction - Admin Portal
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${admin.email}`);
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${admin.email}:`, error);
      throw error;
    }
  }

  private generateJWT(admin: AdminUser): string {
    return jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        adminLevel: admin.adminLevel,
        role: 'admin'
      },
      envConfig.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  private sanitizeUser(admin: AdminUser): AdminUser {
    const sanitized = { ...admin };
    // Remove sensitive data
    if (sanitized.metadata) {
      const { hashedPassword, ...safeMetadata } = sanitized.metadata;
      sanitized.metadata = safeMetadata;
    }
    return sanitized;
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateSecurePassword(): string {
    // Generate a secure random password with at least 16 characters
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // Get admin by email (for testing)
  getAdminByEmail(email: string): AdminUser | undefined {
    return this.adminUsers.get(email.toLowerCase());
  }

  // Get all admins (for admin management)
  getAllAdmins(): AdminUser[] {
    return Array.from(this.adminUsers.values()).map(admin => this.sanitizeUser(admin));
  }

  // Get admin by ID
  async getUserById(id: string): Promise<AdminUser | null> {
    const admin = Array.from(this.adminUsers.values()).find(user => user.id === id);
    return admin ? this.sanitizeUser(admin) : null;
  }
}

// Singleton instance
export const enhancedAdminAuthService = new EnhancedAdminAuthService();