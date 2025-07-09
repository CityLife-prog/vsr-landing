/**
 * Admin User Management Service
 * Service for managing admin users and admin console functionality
 */

import { 
  AdminUser, 
  EmployeeAccount, 
  AdminDashboardStats, 
  DEFAULT_ADMIN_USERS,
  ADMIN_PERMISSIONS
} from '../types/admin';
import { EmployeeAccountService } from './EmployeeAccountService';
import { Role, Permission, DEFAULT_ROLES } from '../auth/types';
import { RBACManager } from '../auth/rbac';
import { v4 as uuidv4 } from 'uuid';

export class AdminUserService {
  private rbacManager: RBACManager;
  private adminUsers: Map<string, AdminUser> = new Map();
  private employeeService: EmployeeAccountService;

  constructor() {
    this.rbacManager = new RBACManager();
    this.employeeService = new EmployeeAccountService();
    this.initializeDefaultAdmins();
  }

  /**
   * Initialize default admin users
   */
  private async initializeDefaultAdmins(): Promise<void> {
    for (const adminConfig of DEFAULT_ADMIN_USERS) {
      const adminUser = await this.createDefaultAdmin(adminConfig);
      this.adminUsers.set(adminUser.id, adminUser);
    }
  }

  /**
   * Create a default admin user
   */
  private async createDefaultAdmin(config: typeof DEFAULT_ADMIN_USERS[number]): Promise<AdminUser> {
    const adminUser: AdminUser = {
      id: uuidv4(),
      email: config.email,
      firstName: config.firstName,
      lastName: config.lastName,
      adminLevel: config.adminLevel,
      roles: await this.getAdminRoles(config.adminLevel),
      permissions: await this.getAdminPermissionsByType(config.permissions),
      managementPermissions: this.getManagementPermissions(),
      canManageUsers: config.adminLevel === 'super_admin' || config.adminLevel === 'admin',
      canManageEmployees: config.permissions === 'all' || config.permissions === 'admin_operations',
      canAccessTraining: config.permissions === 'all' || config.permissions === 'admin_operations',
      canViewReports: config.permissions === 'all' || config.permissions === 'admin_operations',
      canManageSystem: config.permissions === 'all',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: undefined,
      metadata: {
        adminLevel: config.adminLevel,
        isDefaultAdmin: true,
        createdBy: 'system',
        permissionType: config.permissions
      }
    };

    return adminUser;
  }

  /**
   * Get admin roles based on level
   */
  private async getAdminRoles(adminLevel: AdminUser['adminLevel']): Promise<Role[]> {
    const roleMap = {
      'super_admin': [DEFAULT_ROLES.SUPER_ADMIN, DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.MANAGER],
      'admin': [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.MANAGER],
      'manager': [DEFAULT_ROLES.MANAGER]
    };

    return roleMap[adminLevel].map(roleName => ({
      id: uuidv4(),
      name: roleName,
      description: `${adminLevel} role`,
      permissions: [],
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  /**
   * Get admin permissions based on permission type
   */
  private async getAdminPermissionsByType(permissionType: string): Promise<Permission[]> {
    const permissions: Permission[] = [];

    if (permissionType === 'all') {
      // Full development access - all permissions including development tools
      Object.values(ADMIN_PERMISSIONS).forEach(category => {
        Object.values(category).forEach(permission => {
          permissions.push(this.createPermission(permission));
        });
      });
    } else if (permissionType === 'admin_operations') {
      // Admin operations access - excludes development tools
      Object.values(ADMIN_PERMISSIONS.USER_MANAGEMENT).forEach(permission => {
        permissions.push(this.createPermission(permission));
      });
      Object.values(ADMIN_PERMISSIONS.EMPLOYEE_MANAGEMENT).forEach(permission => {
        permissions.push(this.createPermission(permission));
      });
      Object.values(ADMIN_PERMISSIONS.TRAINING_MANAGEMENT).forEach(permission => {
        permissions.push(this.createPermission(permission));
      });
      Object.values(ADMIN_PERMISSIONS.SYSTEM_MANAGEMENT).forEach(permission => {
        permissions.push(this.createPermission(permission));
      });
      // Note: DEVELOPMENT_MANAGEMENT permissions are excluded for admin_operations
    }

    return permissions;
  }

  /**
   * Get admin permissions based on level (legacy method)
   */
  private async getAdminPermissions(adminLevel: AdminUser['adminLevel']): Promise<Permission[]> {
    const permissions: Permission[] = [];

    if (adminLevel === 'super_admin') {
      // Super admin gets all permissions
      Object.values(ADMIN_PERMISSIONS).forEach(category => {
        Object.values(category).forEach(permission => {
          permissions.push(this.createPermission(permission));
        });
      });
    } else if (adminLevel === 'admin') {
      // Admin gets user and employee management + training
      Object.values(ADMIN_PERMISSIONS.USER_MANAGEMENT).forEach(permission => {
        permissions.push(this.createPermission(permission));
      });
      Object.values(ADMIN_PERMISSIONS.EMPLOYEE_MANAGEMENT).forEach(permission => {
        permissions.push(this.createPermission(permission));
      });
      Object.values(ADMIN_PERMISSIONS.TRAINING_MANAGEMENT).forEach(permission => {
        permissions.push(this.createPermission(permission));
      });
    } else if (adminLevel === 'manager') {
      // Manager gets employee management only
      Object.values(ADMIN_PERMISSIONS.EMPLOYEE_MANAGEMENT).forEach(permission => {
        permissions.push(this.createPermission(permission));
      });
    }

    return permissions;
  }

  /**
   * Create a permission object
   */
  private createPermission(permissionName: string): Permission {
    const [resource, action] = permissionName.split(':').slice(1);
    
    return {
      id: uuidv4(),
      name: permissionName,
      resource,
      action,
      description: `Permission to ${action} ${resource}`
    };
  }

  /**
   * Get management permissions for admin level
   */
  private getManagementPermissions() {
    // This would return specific management permissions based on level
    // For now, return empty array as this would be configured based on business needs
    return [];
  }

  /**
   * Get all admin users
   */
  async getAdminUsers(): Promise<AdminUser[]> {
    return Array.from(this.adminUsers.values());
  }

  /**
   * Get admin user by ID
   */
  async getAdminUser(userId: string): Promise<AdminUser | null> {
    return this.adminUsers.get(userId) || null;
  }

  /**
   * Create new admin user
   */
  async createAdminUser(
    userData: Partial<AdminUser>,
    createdBy: string
  ): Promise<AdminUser> {
    const adminUser: AdminUser = {
      id: uuidv4(),
      email: userData.email!,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      adminLevel: userData.adminLevel || 'manager',
      roles: await this.getAdminRoles(userData.adminLevel || 'manager'),
      permissions: await this.getAdminPermissions(userData.adminLevel || 'manager'),
      managementPermissions: this.getManagementPermissions(),
      canManageUsers: userData.adminLevel === 'super_admin' || userData.adminLevel === 'admin',
      canManageEmployees: true,
      canAccessTraining: true,
      canViewReports: userData.adminLevel !== 'manager',
      canManageSystem: userData.adminLevel === 'super_admin',
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        adminLevel: userData.adminLevel || 'manager',
        createdBy
      }
    };

    this.adminUsers.set(adminUser.id, adminUser);
    
    // Log admin creation
    await this.logAdminAction('create_admin', createdBy, adminUser.id, {
      adminLevel: adminUser.adminLevel,
      email: adminUser.email
    });

    return adminUser;
  }

  /**
   * Update admin user
   */
  async updateAdminUser(
    userId: string,
    updates: Partial<AdminUser>,
    updatedBy: string
  ): Promise<AdminUser | null> {
    const existingUser = this.adminUsers.get(userId);
    if (!existingUser) {
      return null;
    }

    const updatedUser: AdminUser = {
      ...existingUser,
      ...updates,
      id: userId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    this.adminUsers.set(userId, updatedUser);

    // Log admin update
    await this.logAdminAction('update_admin', updatedBy, userId, updates);

    return updatedUser;
  }

  /**
   * Delete admin user
   */
  async deleteAdminUser(userId: string, deletedBy: string): Promise<boolean> {
    const user = this.adminUsers.get(userId);
    if (!user) {
      return false;
    }

    // Prevent deletion of default system admins
    if (user.metadata?.isDefaultAdmin) {
      throw new Error('Cannot delete default system admin users');
    }

    this.adminUsers.delete(userId);

    // Log admin deletion
    await this.logAdminAction('delete_admin', deletedBy, userId, {
      email: user.email,
      adminLevel: user.adminLevel
    });

    return true;
  }

  /**
   * Get pending employee accounts
   */
  async getPendingEmployeeAccounts(): Promise<EmployeeAccount[]> {
    return await this.employeeService.getPendingEmployees();
  }

  /**
   * Approve employee account
   */
  async approveEmployeeAccount(
    employeeId: string,
    approvedBy: string,
    notes?: string
  ): Promise<EmployeeAccount | null> {
    const result = await this.employeeService.approveEmployee(employeeId, approvedBy, notes);
    
    if (result) {
      // Log employee approval
      await this.logAdminAction('approve_employee', approvedBy, employeeId, {
        email: result.email,
        employeeId: result.employeeId
      });
    }

    return result;
  }

  /**
   * Reject employee account
   */
  async rejectEmployeeAccount(
    employeeId: string,
    rejectedBy: string,
    reason: string
  ): Promise<boolean> {
    const employee = await this.employeeService.getEmployeeAccount(employeeId);
    if (!employee) {
      return false;
    }

    const result = await this.employeeService.rejectEmployee(employeeId, rejectedBy, reason);
    
    if (result) {
      // Log employee rejection
      await this.logAdminAction('reject_employee', rejectedBy, employeeId, {
        email: employee.email,
        reason
      });
    }

    return result;
  }

  /**
   * Get admin dashboard statistics
   */
  async getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const totalUsers = this.adminUsers.size;
    const employeeStats = await this.employeeService.getEmployeeStatistics();
    const pendingApprovals = employeeStats.pending;
    const activeAdmins = Array.from(this.adminUsers.values())
      .filter(admin => admin.isActive).length;

    return {
      totalUsers,
      totalEmployees: employeeStats.total,
      pendingApprovals,
      activeAdmins,
      recentActivity: [], // Would be populated from activity logs
      systemHealth: {
        status: 'healthy',
        uptime: Date.now(),
        lastHealthCheck: new Date(),
        services: []
      }
    };
  }

  /**
   * Check if user has admin permissions
   */
  async hasAdminPermission(userId: string, permission: string): Promise<boolean> {
    const adminUser = this.adminUsers.get(userId);
    if (!adminUser) {
      return false;
    }

    return adminUser.permissions.some(p => p.name === permission);
  }

  /**
   * Log admin action for audit trail
   */
  private async logAdminAction(
    action: string,
    performedBy: string,
    targetId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    // This would integrate with your logging/audit system
    console.log('Admin Action:', {
      action,
      performedBy,
      targetId,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Verify admin console access
   */
  async verifyAdminConsoleAccess(userId: string): Promise<boolean> {
    const adminUser = this.adminUsers.get(userId);
    return !!(adminUser && adminUser.isActive);
  }
}