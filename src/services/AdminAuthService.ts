/**
 * Admin Authentication Service
 * Handles admin login, password management, and email verification
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { AdminUser, DEFAULT_ADMIN_USERS } from '../types/admin';

interface AdminCredentials {
  id: string;
  email: string;
  passwordHash: string;
  isPasswordDefault: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface LoginResult {
  success: boolean;
  token?: string;
  user?: AdminUser;
  requiresPasswordChange?: boolean;
  requiresEmailVerification?: boolean;
  message?: string;
}

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export class AdminAuthService {
  private credentials: Map<string, AdminCredentials> = new Map();
  private readonly JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  })();
  private readonly DEFAULT_PASSWORD = 'VSRAdmin2025!';
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCK_TIME = 30 * 60 * 1000; // 30 minutes
  private initialized = false;

  constructor() {
    this.initializeDefaultCredentials();
  }

  /**
   * Initialize default admin credentials
   */
  private async initializeDefaultCredentials(): Promise<void> {
    if (this.initialized) return;
    
    for (const admin of DEFAULT_ADMIN_USERS) {
      const passwordHash = await bcrypt.hash(this.DEFAULT_PASSWORD, this.SALT_ROUNDS);
      const credentials: AdminCredentials = {
        id: uuidv4(),
        email: admin.email,
        passwordHash,
        isPasswordDefault: false,
        isEmailVerified: true, // Skip email verification for development
        emailVerificationToken: uuidv4(),
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.credentials.set(admin.email, credentials);
      
      // Skip email sending for development
      console.log(`Admin account created: ${admin.email} (Email verification skipped for development)`);
    }
    
    this.initialized = true;
  }

  /**
   * Admin login
   */
  async login(email: string, password: string): Promise<LoginResult> {
    await this.initializeDefaultCredentials();
    const credentials = this.credentials.get(email);
    
    if (!credentials) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if account is locked
    if (credentials.lockedUntil && credentials.lockedUntil > new Date()) {
      const lockTimeRemaining = Math.ceil((credentials.lockedUntil.getTime() - Date.now()) / 60000);
      return {
        success: false,
        message: `Account is locked. Try again in ${lockTimeRemaining} minutes.`
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, credentials.passwordHash);
    
    if (!isPasswordValid) {
      credentials.loginAttempts += 1;
      
      if (credentials.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        credentials.lockedUntil = new Date(Date.now() + this.LOCK_TIME);
        credentials.updatedAt = new Date();
        this.credentials.set(email, credentials);
        
        return {
          success: false,
          message: 'Account locked due to too many failed attempts. Try again in 30 minutes.'
        };
      }
      
      credentials.updatedAt = new Date();
      this.credentials.set(email, credentials);
      
      return {
        success: false,
        message: `Invalid email or password. ${this.MAX_LOGIN_ATTEMPTS - credentials.loginAttempts} attempts remaining.`
      };
    }

    // Check email verification
    if (!credentials.isEmailVerified) {
      return {
        success: false,
        requiresEmailVerification: true,
        message: 'Please verify your email address before logging in.'
      };
    }

    // Reset login attempts on successful login
    credentials.loginAttempts = 0;
    credentials.lockedUntil = undefined;
    credentials.lastLoginAt = new Date();
    credentials.updatedAt = new Date();
    this.credentials.set(email, credentials);

    // Generate JWT token
    const token = jwt.sign(
      { 
        email: credentials.email,
        id: credentials.id,
        isAdmin: true
      },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      token,
      requiresPasswordChange: credentials.isPasswordDefault,
      message: credentials.isPasswordDefault ? 'Login successful. You must change your password.' : 'Login successful.'
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    for (const [email, credentials] of this.credentials.entries()) {
      if (credentials.emailVerificationToken === token) {
        credentials.isEmailVerified = true;
        credentials.emailVerificationToken = undefined;
        credentials.updatedAt = new Date();
        this.credentials.set(email, credentials);
        
        return {
          success: true,
          message: 'Email verified successfully. You can now log in.'
        };
      }
    }

    return {
      success: false,
      message: 'Invalid or expired verification token.'
    };
  }

  /**
   * Change password
   */
  async changePassword(
    email: string, 
    currentPassword: string | undefined, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    await this.initializeDefaultCredentials();
    const credentials = this.credentials.get(email);
    
    console.log(`Change password attempt for: ${email}`);
    console.log(`Credentials found: ${!!credentials}`);
    console.log(`Is default password: ${credentials?.isPasswordDefault}`);
    
    if (!credentials) {
      return {
        success: false,
        message: 'User not found.'
      };
    }

    // Verify current password (unless it's a forced change with default password)
    if (!credentials.isPasswordDefault && currentPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, credentials.passwordHash);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect.'
        };
      }
    } else if (!credentials.isPasswordDefault && !currentPassword) {
      return {
        success: false,
        message: 'Current password is required.'
      };
    }

    // Validate new password
    const validation = this.validatePassword(newPassword);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors.join(' ')
      };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    
    credentials.passwordHash = newPasswordHash;
    credentials.isPasswordDefault = false;
    credentials.updatedAt = new Date();
    this.credentials.set(email, credentials);

    return {
      success: true,
      message: 'Password changed successfully.'
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const credentials = this.credentials.get(email);
    
    if (!credentials) {
      // Don't reveal if email exists
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      };
    }

    credentials.passwordResetToken = uuidv4();
    credentials.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    credentials.updatedAt = new Date();
    this.credentials.set(email, credentials);

    await this.sendPasswordResetEmail(email, credentials.passwordResetToken);

    return {
      success: true,
      message: 'Password reset email sent.'
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    for (const [email, credentials] of this.credentials.entries()) {
      if (
        credentials.passwordResetToken === token &&
        credentials.passwordResetExpires &&
        credentials.passwordResetExpires > new Date()
      ) {
        // Validate new password
        const validation = this.validatePassword(newPassword);
        if (!validation.isValid) {
          return {
            success: false,
            message: validation.errors.join(' ')
          };
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
        
        credentials.passwordHash = newPasswordHash;
        credentials.isPasswordDefault = false;
        credentials.passwordResetToken = undefined;
        credentials.passwordResetExpires = undefined;
        credentials.updatedAt = new Date();
        this.credentials.set(email, credentials);

        return {
          success: true,
          message: 'Password reset successfully.'
        };
      }
    }

    return {
      success: false,
      message: 'Invalid or expired reset token.'
    };
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long.');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter.');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter.');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number.');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Send email verification
   */
  private async sendVerificationEmail(email: string): Promise<void> {
    const credentials = this.credentials.get(email);
    if (!credentials || !credentials.emailVerificationToken) {
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/verify-email?token=${credentials.emailVerificationToken}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@vsr.com',
      to: email,
      subject: 'VSR Admin Account - Email Verification Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">VSR Admin Account Verification</h2>
          
          <p>Hello,</p>
          
          <p>Your VSR admin account has been created. Please verify your email address to activate your account.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Account Details:</strong></p>
            <p>Email: ${email}</p>
            <p>Default Password: <code style="background: #e1e1e1; padding: 2px 4px; border-radius: 3px;">${this.DEFAULT_PASSWORD}</code></p>
          </div>
          
          <p>
            <a href="${verificationUrl}" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </p>
          
          <p><strong>Important:</strong> You will be required to change your password on first login.</p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Security Note:</strong></p>
            <ul>
              <li>This link expires in 24 hours</li>
              <li>You must change your default password on first login</li>
              <li>Password must contain: 1 uppercase, 1 lowercase, 1 number, 1 special character, minimum 8 characters</li>
            </ul>
          </div>
          
          <p>If you did not request this account, please ignore this email.</p>
          
          <p>Best regards,<br>VSR Security Team</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send verification email to ${email}:`, error);
    }
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@vsr.com',
      to: email,
      subject: 'VSR Admin Account - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          
          <p>Hello,</p>
          
          <p>You requested a password reset for your VSR admin account.</p>
          
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
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send password reset email to ${email}:`, error);
    }
  }

  /**
   * Get admin credentials (for debugging)
   */
  getCredentials(email: string): AdminCredentials | undefined {
    return this.credentials.get(email);
  }

  /**
   * Get default password (for setup purposes)
   */
  getDefaultPassword(): string {
    return this.DEFAULT_PASSWORD;
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { valid: boolean; payload?: unknown } {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET);
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }
}