/**
 * Admin User Management Types
 * Types for admin user management and admin console functionality
 */

import { User, Role, Permission } from '../auth/types';

export interface AdminUser extends User {
  adminLevel: 'super_admin' | 'admin' | 'manager';
  managementPermissions?: AdminPermission[];
  canManageUsers?: boolean;
  canManageEmployees?: boolean;
  canAccessTraining?: boolean;
  canViewReports?: boolean;
  canManageSystem?: boolean;
  requiresPasswordReset?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  password?: string; // For development/display purposes
}

export interface AdminPermission {
  id: string;
  name: string;
  category: 'user_management' | 'employee_management' | 'system_management' | 'training' | 'reports';
  description: string;
  actions: string[];
}

export interface EmployeeAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  position: string;
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  verificationStatus: 'unverified' | 'email_verified' | 'admin_approved' | 'fully_verified';
  hireDate: Date;
  permissions: Permission[];
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalEmployees: number;
  pendingApprovals: number;
  activeAdmins: number;
  recentActivity: ActivityLog[];
  systemHealth: SystemHealth;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastHealthCheck: Date;
  services: ServiceStatus[];
}

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: Date;
}

export interface UserManagementAction {
  type: 'create' | 'update' | 'delete' | 'suspend' | 'activate' | 'approve' | 'reject';
  targetUserId: string;
  data?: Partial<AdminUser | EmployeeAccount>;
  reason?: string;
}

export interface AdminConsoleConfig {
  features: {
    userManagement: boolean;
    employeeManagement: boolean;
    trainingModule: boolean;
    systemReports: boolean;
    auditLogs: boolean;
    systemSettings: boolean;
  };
  permissions: {
    canCreateAdmins: boolean;
    canDeleteUsers: boolean;
    canModifyPermissions: boolean;
    canAccessAuditLogs: boolean;
  };
}

/**
 * Default admin users configuration
 * SECURITY NOTE: No hardcoded passwords - these are generated securely at runtime
 */
export const DEFAULT_ADMIN_USERS = [
  {
    email: 'citylife32@outlook.com',
    firstName: 'CityLife',
    lastName: 'Admin',
    adminLevel: 'super_admin' as const,
    permissions: 'all',
    requiresPasswordReset: true
  },
  {
    email: 'marcus@vsrsnow.com',
    firstName: 'Marcus',
    lastName: 'VSR',
    adminLevel: 'admin' as const,
    permissions: 'admin_operations',
    requiresPasswordReset: true
  },
  {
    email: 'zach@vsrsnow.com',
    firstName: 'Zach',
    lastName: 'VSR',
    adminLevel: 'admin' as const,
    permissions: 'admin_operations',
    requiresPasswordReset: true
  },
  {
    email: 'demo@admin.com',
    firstName: 'Demo',
    lastName: 'Admin',
    adminLevel: 'manager' as const,
    permissions: 'admin_operations',
    requiresPasswordReset: false
  }
] as const;

export const ADMIN_PERMISSIONS = {
  USER_MANAGEMENT: {
    CREATE_USER: 'admin:user:create',
    UPDATE_USER: 'admin:user:update',
    DELETE_USER: 'admin:user:delete',
    VIEW_USERS: 'admin:user:view',
    MANAGE_ROLES: 'admin:user:manage_roles'
  },
  EMPLOYEE_MANAGEMENT: {
    APPROVE_EMPLOYEE: 'admin:employee:approve',
    REJECT_EMPLOYEE: 'admin:employee:reject',
    SUSPEND_EMPLOYEE: 'admin:employee:suspend',
    VIEW_EMPLOYEES: 'admin:employee:view',
    EDIT_EMPLOYEE: 'admin:employee:edit'
  },
  SYSTEM_MANAGEMENT: {
    VIEW_AUDIT_LOGS: 'admin:system:view_logs',
    MANAGE_SETTINGS: 'admin:system:manage_settings',
    VIEW_SYSTEM_HEALTH: 'admin:system:view_health',
    MANAGE_PERMISSIONS: 'admin:system:manage_permissions'
  },
  TRAINING_MANAGEMENT: {
    MANAGE_TRAINING: 'admin:training:manage',
    VIEW_PROGRESS: 'admin:training:view_progress',
    ASSIGN_TRAINING: 'admin:training:assign'
  },
  DEVELOPMENT_MANAGEMENT: {
    MANAGE_DEPLOYMENT: 'admin:dev:manage_deployment',
    ACCESS_DEVELOPMENT_TOOLS: 'admin:dev:access_dev_tools',
    MANAGE_API_INTEGRATIONS: 'admin:dev:manage_api_integrations',
    ACCESS_SYSTEM_CONFIG: 'admin:dev:access_system_config',
    MANAGE_DATABASE: 'admin:dev:manage_database'
  }
} as const;