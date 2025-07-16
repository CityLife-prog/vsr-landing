/**
 * Employee Account Management Service
 * Handle employee registration, verification, and approval workflow
 */

import { EmployeeAccount } from '../types/admin';
import { User, Role, Permission } from '../auth/types';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

export interface EmployeeRegistrationData {
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  position: string;
  hireDate: Date;
  phoneNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface EmployeeVerificationToken {
  id: string;
  employeeId: string;
  token: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
}

export class EmployeeAccountService {
  private employeeAccounts: Map<string, EmployeeAccount> = new Map();
  private verificationTokens: Map<string, EmployeeVerificationToken> = new Map();
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.initializeEmailTransporter();
    // this.loadSampleEmployees(); // Removed for production - no sample data
  }

  /**
   * Initialize email transporter for sending verification emails
   */
  private initializeEmailTransporter(): void {
    // In production, configure with actual SMTP settings
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'noreply@vsr.com',
        pass: process.env.SMTP_PASS || 'password'
      }
    });
  }

  /**
   * Load some sample employees for demo
   */
  private loadSampleEmployees(): void {
    const sampleEmployees: EmployeeAccount[] = [
      {
        id: uuidv4(),
        email: 'john.worker@vsr.com',
        firstName: 'John',
        lastName: 'Worker',
        employeeId: 'EMP001',
        department: 'Operations',
        position: 'Field Technician',
        status: 'pending',
        verificationStatus: 'email_verified',
        hireDate: new Date('2024-01-15'),
        permissions: [],
        roles: [],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10')
      },
      {
        id: uuidv4(),
        email: 'sarah.snow@vsr.com',
        firstName: 'Sarah',
        lastName: 'Snow',
        employeeId: 'EMP002',
        department: 'Operations',
        position: 'Snow Removal Specialist',
        status: 'pending',
        verificationStatus: 'email_verified',
        hireDate: new Date('2024-02-01'),
        permissions: [],
        roles: [],
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25')
      }
    ];

    sampleEmployees.forEach(employee => {
      this.employeeAccounts.set(employee.id, employee);
    });
  }

  /**
   * Register new employee account
   */
  async registerEmployee(registrationData: EmployeeRegistrationData): Promise<{
    employee: EmployeeAccount;
    verificationToken: string;
  }> {
    // Check if employee ID or email already exists
    const existingByEmail = Array.from(this.employeeAccounts.values())
      .find(emp => emp.email === registrationData.email);
    
    const existingById = Array.from(this.employeeAccounts.values())
      .find(emp => emp.employeeId === registrationData.employeeId);

    if (existingByEmail) {
      throw new Error('Email address already registered');
    }

    if (existingById) {
      throw new Error('Employee ID already exists');
    }

    // Create new employee account
    const employeeAccount: EmployeeAccount = {
      id: uuidv4(),
      email: registrationData.email,
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      employeeId: registrationData.employeeId,
      department: registrationData.department,
      position: registrationData.position,
      status: 'pending',
      verificationStatus: 'unverified',
      hireDate: registrationData.hireDate,
      permissions: this.getDefaultEmployeePermissions(),
      roles: this.getDefaultEmployeeRoles(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generate email verification token
    const verificationToken = await this.generateVerificationToken(
      employeeAccount.id,
      'email_verification'
    );

    // Save employee account
    this.employeeAccounts.set(employeeAccount.id, employeeAccount);

    // Send verification email
    await this.sendVerificationEmail(employeeAccount, verificationToken.token);

    return {
      employee: employeeAccount,
      verificationToken: verificationToken.token
    };
  }

  /**
   * Verify employee email
   */
  async verifyEmployeeEmail(token: string): Promise<EmployeeAccount | null> {
    const verificationToken = Array.from(this.verificationTokens.values())
      .find(t => t.token === token && t.type === 'email_verification');

    if (!verificationToken) {
      throw new Error('Invalid verification token');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new Error('Verification token has expired');
    }

    if (verificationToken.usedAt) {
      throw new Error('Verification token has already been used');
    }

    // Mark token as used
    verificationToken.usedAt = new Date();
    this.verificationTokens.set(verificationToken.id, verificationToken);

    // Update employee verification status
    const employee = this.employeeAccounts.get(verificationToken.employeeId);
    if (!employee) {
      throw new Error('Employee account not found');
    }

    employee.verificationStatus = 'email_verified';
    employee.updatedAt = new Date();
    this.employeeAccounts.set(employee.id, employee);

    return employee;
  }

  /**
   * Get employee account by ID
   */
  async getEmployeeAccount(employeeId: string): Promise<EmployeeAccount | null> {
    return this.employeeAccounts.get(employeeId) || null;
  }

  /**
   * Get employee account by email
   */
  async getEmployeeByEmail(email: string): Promise<EmployeeAccount | null> {
    return Array.from(this.employeeAccounts.values())
      .find(emp => emp.email === email) || null;
  }

  /**
   * Get all employee accounts
   */
  async getAllEmployees(): Promise<EmployeeAccount[]> {
    return Array.from(this.employeeAccounts.values());
  }

  /**
   * Get pending employee accounts (email verified, waiting for admin approval)
   */
  async getPendingEmployees(): Promise<EmployeeAccount[]> {
    return Array.from(this.employeeAccounts.values())
      .filter(emp => emp.verificationStatus === 'email_verified' && emp.status === 'pending');
  }

  /**
   * Approve employee account
   */
  async approveEmployee(
    employeeId: string,
    approvedBy: string,
    notes?: string
  ): Promise<EmployeeAccount | null> {
    const employee = this.employeeAccounts.get(employeeId);
    if (!employee) {
      return null;
    }

    employee.status = 'active';
    employee.verificationStatus = 'admin_approved';
    employee.approvedBy = approvedBy;
    employee.approvedAt = new Date();
    employee.notes = notes;
    employee.updatedAt = new Date();

    this.employeeAccounts.set(employeeId, employee);

    // Send approval notification email
    await this.sendApprovalEmail(employee);

    return employee;
  }

  /**
   * Reject employee account
   */
  async rejectEmployee(
    employeeId: string,
    rejectedBy: string,
    reason: string
  ): Promise<boolean> {
    const employee = this.employeeAccounts.get(employeeId);
    if (!employee) {
      return false;
    }

    employee.status = 'terminated';
    employee.verificationStatus = 'unverified';
    employee.notes = `Rejected by ${rejectedBy}: ${reason}`;
    employee.updatedAt = new Date();

    this.employeeAccounts.set(employeeId, employee);

    // Send rejection notification email
    await this.sendRejectionEmail(employee, reason);

    return true;
  }

  /**
   * Update employee account
   */
  async updateEmployee(
    employeeId: string,
    updates: Partial<EmployeeAccount>
  ): Promise<EmployeeAccount | null> {
    const employee = this.employeeAccounts.get(employeeId);
    if (!employee) {
      return null;
    }

    const updatedEmployee = {
      ...employee,
      ...updates,
      id: employeeId, // Prevent ID changes
      updatedAt: new Date()
    };

    this.employeeAccounts.set(employeeId, updatedEmployee);
    return updatedEmployee;
  }

  /**
   * Suspend employee account
   */
  async suspendEmployee(
    employeeId: string,
    suspendedBy: string,
    reason: string
  ): Promise<EmployeeAccount | null> {
    const employee = this.employeeAccounts.get(employeeId);
    if (!employee) {
      return null;
    }

    employee.status = 'suspended';
    employee.notes = `Suspended by ${suspendedBy}: ${reason}`;
    employee.updatedAt = new Date();

    this.employeeAccounts.set(employeeId, employee);
    return employee;
  }

  /**
   * Reactivate employee account
   */
  async reactivateEmployee(
    employeeId: string,
    reactivatedBy: string
  ): Promise<EmployeeAccount | null> {
    const employee = this.employeeAccounts.get(employeeId);
    if (!employee) {
      return null;
    }

    employee.status = 'active';
    employee.notes = `Reactivated by ${reactivatedBy}`;
    employee.updatedAt = new Date();

    this.employeeAccounts.set(employeeId, employee);
    return employee;
  }

  /**
   * Generate verification token
   */
  private async generateVerificationToken(
    employeeId: string,
    type: 'email_verification' | 'password_reset'
  ): Promise<EmployeeVerificationToken> {
    const token = uuidv4() + '-' + Date.now().toString(36);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

    const verificationToken: EmployeeVerificationToken = {
      id: uuidv4(),
      employeeId,
      token,
      type,
      expiresAt,
      createdAt: new Date()
    };

    this.verificationTokens.set(verificationToken.id, verificationToken);
    return verificationToken;
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(
    employee: EmployeeAccount,
    token: string
  ): Promise<void> {
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee/verify?token=${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'VSR <noreply@vsr.com>',
      to: employee.email,
      subject: 'VSR Employee Account - Email Verification Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to VSR!</h2>
          <p>Hello ${employee.firstName} ${employee.lastName},</p>
          <p>Your employee account has been created. Please verify your email address to continue with the approval process.</p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <strong>Employee Details:</strong><br>
            Employee ID: ${employee.employeeId}<br>
            Department: ${employee.department}<br>
            Position: ${employee.position}<br>
            Hire Date: ${employee.hireDate.toLocaleDateString()}
          </div>
          
          <p>
            <a href="${verificationUrl}" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </p>
          
          <p>After email verification, your account will be reviewed by an administrator for final approval.</p>
          
          <p style="color: #666; font-size: 14px;">
            This verification link will expire in 24 hours. If you didn't request this account, please ignore this email.
          </p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">VSR - Professional Snow & Ice Management</p>
        </div>
      `
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Verification email sent to:', employee.email);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // In production, you might want to queue this for retry
    }
  }

  /**
   * Send approval notification email
   */
  private async sendApprovalEmail(employee: EmployeeAccount): Promise<void> {
    const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee/login`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'VSR <noreply@vsr.com>',
      to: employee.email,
      subject: 'VSR Employee Account - Account Approved!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Approved!</h2>
          <p>Hello ${employee.firstName} ${employee.lastName},</p>
          <p>Great news! Your VSR employee account has been approved and is now active.</p>
          
          <div style="background: #d4edda; padding: 20px; margin: 20px 0; border-radius: 5px; border: 1px solid #c3e6cb;">
            <strong>✅ Account Status: ACTIVE</strong><br>
            Employee ID: ${employee.employeeId}<br>
            Department: ${employee.department}<br>
            Position: ${employee.position}
          </div>
          
          <p>You can now access your employee dashboard and tools:</p>
          
          <p>
            <a href="${loginUrl}" 
               style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Access Employee Dashboard
            </a>
          </p>
          
          <p>Your employee dashboard includes:</p>
          <ul>
            <li>Service data entry forms</li>
            <li>Training modules</li>
            <li>Work schedule and assignments</li>
            <li>Company resources and tools</li>
          </ul>
          
          ${employee.notes ? `<p><strong>Admin Notes:</strong> ${employee.notes}</p>` : ''}
          
          <hr style="margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">VSR - Professional Snow & Ice Management</p>
        </div>
      `
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Approval email sent to:', employee.email);
    } catch (error) {
      console.error('Failed to send approval email:', error);
    }
  }

  /**
   * Send rejection notification email
   */
  private async sendRejectionEmail(employee: EmployeeAccount, reason: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'VSR <noreply@vsr.com>',
      to: employee.email,
      subject: 'VSR Employee Account - Application Status',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Application Update</h2>
          <p>Hello ${employee.firstName} ${employee.lastName},</p>
          <p>Thank you for your interest in joining VSR. After review, we are unable to approve your employee account at this time.</p>
          
          <div style="background: #f8d7da; padding: 20px; margin: 20px 0; border-radius: 5px; border: 1px solid #f5c6cb;">
            <strong>Reason:</strong> ${reason}
          </div>
          
          <p>If you believe this is an error or have questions about this decision, please contact your supervisor or HR department.</p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">VSR - Professional Snow & Ice Management</p>
        </div>
      `
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Rejection email sent to:', employee.email);
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }
  }

  /**
   * Get default employee permissions
   */
  private getDefaultEmployeePermissions(): Permission[] {
    return [
      {
        id: uuidv4(),
        name: 'employee:dashboard:read',
        resource: 'dashboard',
        action: 'read',
        description: 'Access employee dashboard'
      },
      {
        id: uuidv4(),
        name: 'employee:forms:write',
        resource: 'forms',
        action: 'write',
        description: 'Submit service data forms'
      },
      {
        id: uuidv4(),
        name: 'employee:training:read',
        resource: 'training',
        action: 'read',
        description: 'Access training modules'
      }
    ];
  }

  /**
   * Get default employee roles
   */
  private getDefaultEmployeeRoles(): Role[] {
    return [
      {
        id: uuidv4(),
        name: 'employee',
        description: 'Standard employee role',
        permissions: this.getDefaultEmployeePermissions(),
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  /**
   * Check if employee exists by employee ID
   */
  async employeeIdExists(employeeId: string): Promise<boolean> {
    return Array.from(this.employeeAccounts.values())
      .some(emp => emp.employeeId === employeeId);
  }

  /**
   * Check if employee email exists
   */
  async employeeEmailExists(email: string): Promise<boolean> {
    return Array.from(this.employeeAccounts.values())
      .some(emp => emp.email === email);
  }

  /**
   * Get employee statistics
   */
  async getEmployeeStatistics(): Promise<{
    total: number;
    pending: number;
    active: number;
    suspended: number;
    unverified: number;
  }> {
    const employees = Array.from(this.employeeAccounts.values());
    
    return {
      total: employees.length,
      pending: employees.filter(emp => emp.status === 'pending').length,
      active: employees.filter(emp => emp.status === 'active').length,
      suspended: employees.filter(emp => emp.status === 'suspended').length,
      unverified: employees.filter(emp => emp.verificationStatus === 'unverified').length
    };
  }

  /**
   * Restore employee account (used for database cleanup)
   */
  async restoreEmployee(employeeData: EmployeeAccount): Promise<EmployeeAccount> {
    this.employeeAccounts.set(employeeData.id, employeeData);
    return employeeData;
  }
}