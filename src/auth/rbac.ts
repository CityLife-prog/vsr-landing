/**
 * Role-Based Access Control (RBAC) System
 * Comprehensive permission and role management with hierarchical support
 */

import {
  User,
  Role,
  Permission,
  PermissionCondition,
  AuthorizationResult,
  AuthContext,
  RBACConfig,
  ResourceAction,
  DEFAULT_ROLES
} from './types';

// RBAC Manager
export class RBACManager {
  private config: RBACConfig;
  private roleHierarchy = new Map<string, string[]>(); // role -> parent roles
  private permissionCache = new Map<string, Permission[]>();
  private roleCache = new Map<string, Role[]>();

  constructor(config: Partial<RBACConfig> = {}) {
    this.config = {
      enableHierarchy: true,
      enableInheritance: true,
      enableContextualPermissions: true,
      cachePermissions: true,
      cacheTTL: 300000, // 5 minutes
      ...config
    };

    this.setupDefaultHierarchy();
  }

  /**
   * Setup default role hierarchy
   */
  private setupDefaultHierarchy(): void {
    if (!this.config.enableHierarchy) return;

    // Super Admin inherits from Admin
    this.setRoleHierarchy(DEFAULT_ROLES.SUPER_ADMIN, [DEFAULT_ROLES.ADMIN]);
    
    // Admin inherits from Manager
    this.setRoleHierarchy(DEFAULT_ROLES.ADMIN, [DEFAULT_ROLES.MANAGER]);
    
    // Manager inherits from User
    this.setRoleHierarchy(DEFAULT_ROLES.MANAGER, [DEFAULT_ROLES.USER]);
    
    // User inherits from Guest
    this.setRoleHierarchy(DEFAULT_ROLES.USER, [DEFAULT_ROLES.GUEST]);
  }

  /**
   * Set role hierarchy
   */
  setRoleHierarchy(role: string, parentRoles: string[]): void {
    this.roleHierarchy.set(role, parentRoles);
    this.clearCache();
  }

  /**
   * Get role hierarchy
   */
  getRoleHierarchy(role: string): string[] {
    const visited = new Set<string>();
    const hierarchy: string[] = [];

    const traverse = (currentRole: string) => {
      if (visited.has(currentRole)) {
        return; // Prevent infinite loops
      }
      visited.add(currentRole);
      hierarchy.push(currentRole);

      const parents = this.roleHierarchy.get(currentRole) || [];
      for (const parent of parents) {
        traverse(parent);
      }
    };

    traverse(role);
    return hierarchy;
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    user: User,
    permission: string,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const result = await this.checkPermission(user, permission, context);
      return result.granted;
    } catch {
      return false;
    }
  }

  /**
   * Check permission with detailed result
   */
  async checkPermission(
    user: User,
    permission: string,
    context?: Record<string, unknown>
  ): Promise<AuthorizationResult> {
    // Check direct user permissions
    const userPermissions = await this.getUserPermissions(user.id);
    const directPermission = userPermissions.find(p => p.name === permission);
    
    if (directPermission) {
      const conditionResult = await this.evaluateConditions(
        directPermission.conditions || [],
        context
      );
      
      if (conditionResult) {
        return { granted: true };
      }
    }

    // Check role-based permissions
    const userRoles = await this.getUserRoles(user.id);
    for (const role of userRoles) {
      const rolePermissions = await this.getRolePermissions(role.id);
      const rolePermission = rolePermissions.find(p => p.name === permission);
      
      if (rolePermission) {
        const conditionResult = await this.evaluateConditions(
          rolePermission.conditions || [],
          context
        );
        
        if (conditionResult) {
          return { granted: true };
        }
      }
    }

    // Check inherited permissions if hierarchy is enabled
    if (this.config.enableHierarchy && this.config.enableInheritance) {
      for (const role of userRoles) {
        const inheritedRoles = this.getRoleHierarchy(role.name);
        
        for (const inheritedRoleName of inheritedRoles) {
          if (inheritedRoleName === role.name) continue; // Skip self
          
          const inheritedRole = await this.findRoleByName(inheritedRoleName);
          if (inheritedRole) {
            const inheritedPermissions = await this.getRolePermissions(inheritedRole.id);
            const inheritedPermission = inheritedPermissions.find(p => p.name === permission);
            
            if (inheritedPermission) {
              const conditionResult = await this.evaluateConditions(
                inheritedPermission.conditions || [],
                context
              );
              
              if (conditionResult) {
                return { granted: true };
              }
            }
          }
        }
      }
    }

    return {
      granted: false,
      reason: 'Permission denied',
      requiredPermissions: [permission],
      missingPermissions: [permission]
    };
  }

  /**
   * Check if user has role
   */
  async hasRole(user: User, roleName: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(user.id);
    
    // Check direct roles
    if (userRoles.some(role => role.name === roleName)) {
      return true;
    }

    // Check inherited roles if hierarchy is enabled
    if (this.config.enableHierarchy) {
      for (const role of userRoles) {
        const hierarchy = this.getRoleHierarchy(role.name);
        if (hierarchy.includes(roleName)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check multiple permissions
   */
  async checkPermissions(
    user: User,
    permissions: string[],
    context?: Record<string, unknown>
  ): Promise<AuthorizationResult> {
    const results = await Promise.all(
      permissions.map(permission => this.checkPermission(user, permission, context))
    );

    const granted = results.every(result => result.granted);
    const missingPermissions = permissions.filter((_, index) => !results[index].granted);

    return {
      granted,
      reason: granted ? undefined : 'Some permissions are missing',
      requiredPermissions: permissions,
      missingPermissions
    };
  }

  /**
   * Authorize user for resource and action
   */
  async authorize(
    context: AuthContext,
    resource: string,
    action: string,
    additionalContext?: Record<string, unknown>
  ): Promise<AuthorizationResult> {
    const permission = `${resource}:${action}`;
    const mergedContext = { ...context, ...additionalContext };
    
    return this.checkPermission(context.user, permission, mergedContext);
  }

  /**
   * Get effective permissions for user
   */
  async getEffectivePermissions(userId: string): Promise<Permission[]> {
    if (this.config.cachePermissions) {
      const cached = this.permissionCache.get(userId);
      if (cached) {
        return cached;
      }
    }

    const permissions = new Map<string, Permission>();

    // Get direct user permissions
    const userPermissions = await this.getUserPermissions(userId);
    userPermissions.forEach(permission => {
      permissions.set(permission.name, permission);
    });

    // Get role-based permissions
    const userRoles = await this.getUserRoles(userId);
    for (const role of userRoles) {
      const rolePermissions = await this.getRolePermissions(role.id);
      rolePermissions.forEach(permission => {
        permissions.set(permission.name, permission);
      });

      // Get inherited permissions
      if (this.config.enableHierarchy && this.config.enableInheritance) {
        const inheritedRoles = this.getRoleHierarchy(role.name);
        
        for (const inheritedRoleName of inheritedRoles) {
          if (inheritedRoleName === role.name) continue;
          
          const inheritedRole = await this.findRoleByName(inheritedRoleName);
          if (inheritedRole) {
            const inheritedPermissions = await this.getRolePermissions(inheritedRole.id);
            inheritedPermissions.forEach(permission => {
              permissions.set(permission.name, permission);
            });
          }
        }
      }
    }

    const effectivePermissions = Array.from(permissions.values());

    // Cache the result
    if (this.config.cachePermissions) {
      this.permissionCache.set(userId, effectivePermissions);
      
      // Set cache expiration
      setTimeout(() => {
        this.permissionCache.delete(userId);
      }, this.config.cacheTTL);
    }

    return effectivePermissions;
  }

  /**
   * Get effective roles for user
   */
  async getEffectiveRoles(userId: string): Promise<Role[]> {
    if (this.config.cachePermissions) {
      const cached = this.roleCache.get(userId);
      if (cached) {
        return cached;
      }
    }

    const roles = new Map<string, Role>();

    // Get direct user roles
    const userRoles = await this.getUserRoles(userId);
    userRoles.forEach(role => {
      roles.set(role.name, role);
    });

    // Get inherited roles
    if (this.config.enableHierarchy) {
      for (const role of userRoles) {
        const inheritedRoleNames = this.getRoleHierarchy(role.name);
        
        for (const inheritedRoleName of inheritedRoleNames) {
          if (inheritedRoleName === role.name) continue;
          
          const inheritedRole = await this.findRoleByName(inheritedRoleName);
          if (inheritedRole) {
            roles.set(inheritedRole.name, inheritedRole);
          }
        }
      }
    }

    const effectiveRoles = Array.from(roles.values());

    // Cache the result
    if (this.config.cachePermissions) {
      this.roleCache.set(userId, effectiveRoles);
      
      // Set cache expiration
      setTimeout(() => {
        this.roleCache.delete(userId);
      }, this.config.cacheTTL);
    }

    return effectiveRoles;
  }

  /**
   * Evaluate permission conditions
   */
  private async evaluateConditions(
    conditions: PermissionCondition[],
    context?: Record<string, unknown>
  ): Promise<boolean> {
    if (!conditions.length) {
      return true;
    }

    if (!context || !this.config.enableContextualPermissions) {
      return true; // If no context or contextual permissions disabled, allow
    }

    for (const condition of conditions) {
      const contextValue = this.getNestedValue(context, condition.field);
      
      if (!this.evaluateCondition(contextValue, condition.operator, condition.value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(contextValue: unknown, operator: string, expectedValue: unknown): boolean {
    switch (operator) {
      case 'eq':
        return contextValue === expectedValue;
      case 'ne':
        return contextValue !== expectedValue;
      case 'gt':
        return contextValue > expectedValue;
      case 'gte':
        return contextValue >= expectedValue;
      case 'lt':
        return contextValue < expectedValue;
      case 'lte':
        return contextValue <= expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(contextValue);
      case 'nin':
        return Array.isArray(expectedValue) && !expectedValue.includes(contextValue);
      case 'contains':
        return typeof contextValue === 'string' && contextValue.includes(String(expectedValue));
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.roleCache.clear();
  }

  /**
   * Get user permissions (to be implemented with actual data source)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getUserPermissions(_userId: string): Promise<Permission[]> {
    // This would be implemented with actual database/service calls
    // For now, return empty array
    return [];
  }

  /**
   * Get user roles (to be implemented with actual data source)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getUserRoles(_userId: string): Promise<Role[]> {
    // This would be implemented with actual database/service calls
    // For now, return empty array
    return [];
  }

  /**
   * Get role permissions (to be implemented with actual data source)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getRolePermissions(_roleId: string): Promise<Permission[]> {
    // This would be implemented with actual database/service calls
    // For now, return empty array
    return [];
  }

  /**
   * Find role by name (to be implemented with actual data source)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async findRoleByName(_roleName: string): Promise<Role | null> {
    // This would be implemented with actual database/service calls
    // For now, return null
    return null;
  }
}

// Permission Builder for creating complex permissions
export class PermissionBuilder {
  private permission: Partial<Permission> = {
    conditions: []
  };

  constructor(name: string, resource: string, action: string) {
    this.permission.name = name;
    this.permission.resource = resource;
    this.permission.action = action;
  }

  description(desc: string): this {
    this.permission.description = desc;
    return this;
  }

  condition(field: string, operator: PermissionCondition['operator'], value: unknown): this {
    if (!this.permission.conditions) {
      this.permission.conditions = [];
    }
    
    this.permission.conditions.push({ field, operator, value });
    return this;
  }

  build(): Permission {
    if (!this.permission.id) {
      this.permission.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return this.permission as Permission;
  }
}

// Role Builder for creating complex roles
export class RoleBuilder {
  private role: Partial<Role> = {
    permissions: []
  };

  constructor(name: string) {
    this.role.name = name;
    this.role.isSystemRole = false;
  }

  description(desc: string): this {
    this.role.description = desc;
    return this;
  }

  systemRole(isSystem: boolean = true): this {
    this.role.isSystemRole = isSystem;
    return this;
  }

  permission(permission: Permission): this {
    if (!this.role.permissions) {
      this.role.permissions = [];
    }
    
    this.role.permissions.push(permission);
    return this;
  }

  permissions(permissions: Permission[]): this {
    this.role.permissions = permissions;
    return this;
  }

  build(): Role {
    if (!this.role.id) {
      this.role.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const now = new Date();
    this.role.createdAt = now;
    this.role.updatedAt = now;
    
    return this.role as Role;
  }
}

// Default Permissions Factory
export class DefaultPermissions {
  static createUserPermissions(): Permission[] {
    return [
      new PermissionBuilder('user:read', 'user', 'read')
        .description('Read user profile')
        .condition('user.id', 'eq', '${context.user.id}')
        .build(),
      
      new PermissionBuilder('user:write', 'user', 'write')
        .description('Update user profile')
        .condition('user.id', 'eq', '${context.user.id}')
        .build(),
      
      new PermissionBuilder('quote:read', 'quote', 'read')
        .description('Read user quotes')
        .condition('quote.userId', 'eq', '${context.user.id}')
        .build(),
      
      new PermissionBuilder('quote:write', 'quote', 'write')
        .description('Create and update quotes')
        .condition('quote.userId', 'eq', '${context.user.id}')
        .build()
    ];
  }

  static createManagerPermissions(): Permission[] {
    return [
      ...this.createUserPermissions(),
      
      new PermissionBuilder('quote:approve', 'quote', 'approve')
        .description('Approve quotes')
        .build(),
      
      new PermissionBuilder('user:read_all', 'user', 'read')
        .description('Read all user profiles')
        .build(),
      
      new PermissionBuilder('quote:read_all', 'quote', 'read')
        .description('Read all quotes')
        .build()
    ];
  }

  static createAdminPermissions(): Permission[] {
    return [
      ...this.createManagerPermissions(),
      
      new PermissionBuilder('admin:users', 'admin', 'users')
        .description('Manage users')
        .build(),
      
      new PermissionBuilder('admin:roles', 'admin', 'roles')
        .description('Manage roles')
        .build(),
      
      new PermissionBuilder('user:delete', 'user', 'delete')
        .description('Delete users')
        .build(),
      
      new PermissionBuilder('quote:delete', 'quote', 'delete')
        .description('Delete quotes')
        .build()
    ];
  }

  static createSuperAdminPermissions(): Permission[] {
    return [
      ...this.createAdminPermissions(),
      
      new PermissionBuilder('admin:permissions', 'admin', 'permissions')
        .description('Manage permissions')
        .build(),
      
      new PermissionBuilder('admin:system', 'admin', 'system')
        .description('System administration')
        .build(),
      
      new PermissionBuilder('system:health', 'system', 'health')
        .description('System health monitoring')
        .build(),
      
      new PermissionBuilder('system:metrics', 'system', 'metrics')
        .description('System metrics access')
        .build(),
      
      new PermissionBuilder('system:logs', 'system', 'logs')
        .description('System logs access')
        .build()
    ];
  }
}

// Default Roles Factory
export class DefaultRoles {
  static createGuestRole(): Role {
    return new RoleBuilder(DEFAULT_ROLES.GUEST)
      .description('Guest user with minimal permissions')
      .systemRole(true)
      .permissions([])
      .build();
  }

  static createUserRole(): Role {
    return new RoleBuilder(DEFAULT_ROLES.USER)
      .description('Regular user')
      .systemRole(true)
      .permissions(DefaultPermissions.createUserPermissions())
      .build();
  }

  static createManagerRole(): Role {
    return new RoleBuilder(DEFAULT_ROLES.MANAGER)
      .description('Manager with quote approval permissions')
      .systemRole(true)
      .permissions(DefaultPermissions.createManagerPermissions())
      .build();
  }

  static createAdminRole(): Role {
    return new RoleBuilder(DEFAULT_ROLES.ADMIN)
      .description('Administrator with user management permissions')
      .systemRole(true)
      .permissions(DefaultPermissions.createAdminPermissions())
      .build();
  }

  static createSuperAdminRole(): Role {
    return new RoleBuilder(DEFAULT_ROLES.SUPER_ADMIN)
      .description('Super administrator with full system access')
      .systemRole(true)
      .permissions(DefaultPermissions.createSuperAdminPermissions())
      .build();
  }

  static createAllDefaultRoles(): Role[] {
    return [
      this.createGuestRole(),
      this.createUserRole(),
      this.createManagerRole(),
      this.createAdminRole(),
      this.createSuperAdminRole()
    ];
  }
}

// RBAC Utilities
export class RBACUtils {
  /**
   * Parse resource action string
   */
  static parseResourceAction(resourceAction: ResourceAction): { resource: string; action: string } {
    const [resource, action] = resourceAction.split(':');
    return { resource, action };
  }

  /**
   * Create resource action string
   */
  static createResourceAction(resource: string, action: string): ResourceAction {
    return `${resource}:${action}` as ResourceAction;
  }

  /**
   * Check if permission matches pattern
   */
  static matchesPattern(permission: string, pattern: string): boolean {
    // Convert pattern to regex (supports wildcards)
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(permission);
  }

  /**
   * Get resource from permission
   */
  static getResource(permission: string): string {
    return permission.split(':')[0];
  }

  /**
   * Get action from permission
   */
  static getAction(permission: string): string {
    return permission.split(':')[1] || '*';
  }

  /**
   * Check if user has any of the permissions
   */
  static async hasAnyPermission(
    rbac: RBACManager,
    user: User,
    permissions: string[],
    context?: Record<string, unknown>
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await rbac.hasPermission(user, permission, context)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all permissions
   */
  static async hasAllPermissions(
    rbac: RBACManager,
    user: User,
    permissions: string[],
    context?: Record<string, unknown>
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await rbac.hasPermission(user, permission, context))) {
        return false;
      }
    }
    return true;
  }
}