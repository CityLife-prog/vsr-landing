/**
 * Authentication Decorators and Helpers
 * Easy-to-use decorators and utilities for protecting components and routes
 */

import React, { ComponentType, useContext, createContext, ReactNode } from 'react';
import {
  AuthContext,
  User,
  AuthenticationError,
  AuthErrorCode
} from './types';
import { withAuth, AuthenticatedHandler } from './middleware';

// React Context for Authentication
const AuthenticationContext = createContext<AuthContext | null>(null);

// Authentication Provider Component
export interface AuthProviderProps {
  children: ReactNode;
  authContext?: AuthContext;
}

export function AuthProvider({ children, authContext }: AuthProviderProps) {
  return React.createElement(
    AuthenticationContext.Provider,
    { value: authContext || null },
    children
  );
}

// Hook for accessing authentication context
export function useAuth(): AuthContext {
  const context = useContext(AuthenticationContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for optional authentication context
export function useOptionalAuth(): AuthContext | null {
  return useContext(AuthenticationContext);
}

// Higher-order component for protecting React components
export interface RequireAuthOptions {
  permissions?: string[];
  roles?: string[];
  redirectTo?: string;
  fallback?: ComponentType;
}

export function requireAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: RequireAuthOptions = {}
) {
  const RequireAuthComponent = (props: P) => {
    const authContext = useOptionalAuth();

    // If not authenticated, show fallback or redirect
    if (!authContext?.isAuthenticated) {
      if (options.fallback) {
        const FallbackComponent = options.fallback;
        return React.createElement(FallbackComponent);
      }
      
      if (options.redirectTo && typeof window !== 'undefined') {
        window.location.href = options.redirectTo;
        return null;
      }

      throw new AuthenticationError(
        'Authentication required',
        AuthErrorCode.TOKEN_INVALID
      );
    }

    // Check permissions if specified
    if (options.permissions && options.permissions.length > 0) {
      const hasPermissions = options.permissions.every(permission =>
        authContext.permissions.some(p => p.name === permission)
      );

      if (!hasPermissions) {
        if (options.fallback) {
          const FallbackComponent = options.fallback;
          return React.createElement(FallbackComponent);
        }

        throw new AuthenticationError(
          'Insufficient permissions',
          AuthErrorCode.INSUFFICIENT_PERMISSIONS
        );
      }
    }

    // Check roles if specified
    if (options.roles && options.roles.length > 0) {
      const hasRoles = options.roles.some(role =>
        authContext.roles.some(r => r.name === role)
      );

      if (!hasRoles) {
        if (options.fallback) {
          const FallbackComponent = options.fallback;
          return React.createElement(FallbackComponent);
        }

        throw new AuthenticationError(
          'Insufficient role permissions',
          AuthErrorCode.INSUFFICIENT_PERMISSIONS
        );
      }
    }

    return React.createElement(WrappedComponent, props);
  };

  RequireAuthComponent.displayName = `RequireAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return RequireAuthComponent;
}

// Decorator for API routes that require authentication
export function authenticated(
  permissions?: string[],
  roles?: string[]
) {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, { permissions, roles });
  };
}

// Decorator for API routes with optional authentication
export function optionalAuth() {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, { optional: true });
  };
}

// Decorator for admin-only routes
export function adminOnly() {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, { roles: ['admin', 'super_admin'] });
  };
}

// Decorator for manager-level routes
export function managerLevel() {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, { roles: ['manager', 'admin', 'super_admin'] });
  };
}

// Decorator for user-level routes (authenticated users)
export function userLevel() {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, { roles: ['user', 'manager', 'admin', 'super_admin'] });
  };
}

// Decorator for rate-limited routes
export function rateLimited(maxRequests: number = 100, windowMs: number = 60000) {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, {
      rateLimit: {
        enabled: true,
        maxRequests,
        windowMs,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      }
    });
  };
}

// Decorator for specific permission requirements
export function requirePermissions(...permissions: string[]) {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, { permissions });
  };
}

// Decorator for specific role requirements
export function requireRoles(...roles: string[]) {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, { roles });
  };
}

// Decorator combining authentication and rate limiting
export function secureRoute(options: {
  permissions?: string[];
  roles?: string[];
  rateLimit?: { maxRequests: number; windowMs: number };
}) {
  return function (handler: AuthenticatedHandler) {
    return withAuth(handler, {
      permissions: options.permissions,
      roles: options.roles,
      rateLimit: options.rateLimit ? {
        enabled: true,
        maxRequests: options.rateLimit.maxRequests,
        windowMs: options.rateLimit.windowMs,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      } : undefined
    });
  };
}

// Helper function to check if user has permission
export function hasPermission(authContext: AuthContext, permission: string): boolean {
  if (!authContext.isAuthenticated) {
    return false;
  }
  
  return authContext.permissions.some(p => p.name === permission);
}

// Helper function to check if user has any of the permissions
export function hasAnyPermission(authContext: AuthContext, permissions: string[]): boolean {
  if (!authContext.isAuthenticated) {
    return false;
  }
  
  return permissions.some(permission => hasPermission(authContext, permission));
}

// Helper function to check if user has all permissions
export function hasAllPermissions(authContext: AuthContext, permissions: string[]): boolean {
  if (!authContext.isAuthenticated) {
    return false;
  }
  
  return permissions.every(permission => hasPermission(authContext, permission));
}

// Helper function to check if user has role
export function hasRole(authContext: AuthContext, role: string): boolean {
  if (!authContext.isAuthenticated) {
    return false;
  }
  
  return authContext.roles.some(r => r.name === role);
}

// Helper function to check if user has any of the roles
export function hasAnyRole(authContext: AuthContext, roles: string[]): boolean {
  if (!authContext.isAuthenticated) {
    return false;
  }
  
  return roles.some(role => hasRole(authContext, role));
}

// Helper function to get user display name
export function getUserDisplayName(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  if (user.firstName) {
    return user.firstName;
  }
  
  if (user.username) {
    return user.username;
  }
  
  return user.email;
}

// Helper function to check if user is admin
export function isAdmin(authContext: AuthContext): boolean {
  return hasAnyRole(authContext, ['admin', 'super_admin']);
}

// Helper function to check if user is manager or above
export function isManager(authContext: AuthContext): boolean {
  return hasAnyRole(authContext, ['manager', 'admin', 'super_admin']);
}

// Helper function to check if user can manage users
export function canManageUsers(authContext: AuthContext): boolean {
  return hasPermission(authContext, 'admin:users') || isAdmin(authContext);
}

// Helper function to check if user can approve quotes
export function canApproveQuotes(authContext: AuthContext): boolean {
  return hasPermission(authContext, 'quote:approve') || isManager(authContext);
}

// Component for conditionally rendering based on authentication
export interface AuthGuardProps {
  children: ReactNode;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean; // Whether to require all permissions/roles or just one
  fallback?: ReactNode;
}

export function AuthGuard({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null
}: AuthGuardProps) {
  const authContext = useOptionalAuth();

  if (!authContext?.isAuthenticated) {
    return React.createElement(React.Fragment, null, fallback);
  }

  // Check permissions
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(authContext, permissions)
      : hasAnyPermission(authContext, permissions);
    
    if (!hasRequiredPermissions) {
      return React.createElement(React.Fragment, null, fallback);
    }
  }

  // Check roles
  if (roles.length > 0) {
    const hasRequiredRoles = requireAll
      ? roles.every(role => hasRole(authContext, role))
      : hasAnyRole(authContext, roles);
    
    if (!hasRequiredRoles) {
      return React.createElement(React.Fragment, null, fallback);
    }
  }

  return React.createElement(React.Fragment, null, children);
}

// Component for showing content only to authenticated users
export function AuthenticatedOnly({ children, fallback = null }: { 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  const authContext = useOptionalAuth();
  
  if (!authContext?.isAuthenticated) {
    return React.createElement(React.Fragment, null, fallback);
  }
  
  return React.createElement(React.Fragment, null, children);
}

// Component for showing content only to unauthenticated users
export function UnauthenticatedOnly({ children, fallback = null }: { 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  const authContext = useOptionalAuth();
  
  if (authContext?.isAuthenticated) {
    return React.createElement(React.Fragment, null, fallback);
  }
  
  return React.createElement(React.Fragment, null, children);
}

// Hook for user permissions
export function usePermissions(): string[] {
  const authContext = useAuth();
  return authContext.permissions.map(p => p.name);
}

// Hook for user roles
export function useRoles(): string[] {
  const authContext = useAuth();
  return authContext.roles.map(r => r.name);
}

// Hook for user info
export function useUser(): User {
  const authContext = useAuth();
  return authContext.user;
}

// Hook for checking if user is authenticated
export function useIsAuthenticated(): boolean {
  const authContext = useOptionalAuth();
  return authContext?.isAuthenticated ?? false;
}

// Utility for creating protected API route handlers
export const createProtectedHandler = {
  // For user-level operations
  user: (handler: AuthenticatedHandler) => userLevel()(handler),
  
  // For manager-level operations
  manager: (handler: AuthenticatedHandler) => managerLevel()(handler),
  
  // For admin-level operations
  admin: (handler: AuthenticatedHandler) => adminOnly()(handler),
  
  // For specific permissions
  withPermissions: (permissions: string[]) => (handler: AuthenticatedHandler) => 
    requirePermissions(...permissions)(handler),
  
  // For specific roles
  withRoles: (roles: string[]) => (handler: AuthenticatedHandler) => 
    requireRoles(...roles)(handler),
  
  // For rate-limited endpoints
  rateLimited: (maxRequests: number, windowMs: number) => (handler: AuthenticatedHandler) =>
    rateLimited(maxRequests, windowMs)(handler),
  
  // For quote management
  quoteRead: (handler: AuthenticatedHandler) => 
    requirePermissions('quote:read')(handler),
  
  quoteWrite: (handler: AuthenticatedHandler) => 
    requirePermissions('quote:write')(handler),
  
  quoteApprove: (handler: AuthenticatedHandler) => 
    requirePermissions('quote:approve')(handler),
  
  // For user management
  userManagement: (handler: AuthenticatedHandler) => 
    requirePermissions('admin:users')(handler)
};

// Default fallback components
export function UnauthorizedFallback() {
  return React.createElement(
    'div',
    { style: { padding: '20px', textAlign: 'center' } },
    React.createElement('h2', null, 'Access Denied'),
    React.createElement('p', null, 'You don\'t have permission to access this resource.')
  );
}

export function UnauthenticatedFallback() {
  return React.createElement(
    'div',
    { style: { padding: '20px', textAlign: 'center' } },
    React.createElement('h2', null, 'Authentication Required'),
    React.createElement('p', null, 'Please log in to access this resource.')
  );
}

// VSR-specific permission helpers
export const VSRPermissions = {
  // Quote-related permissions
  canReadQuotes: (authContext: AuthContext) => 
    hasPermission(authContext, 'quote:read'),
  
  canWriteQuotes: (authContext: AuthContext) => 
    hasPermission(authContext, 'quote:write'),
  
  canApproveQuotes: (authContext: AuthContext) => 
    hasPermission(authContext, 'quote:approve'),
  
  canDeleteQuotes: (authContext: AuthContext) => 
    hasPermission(authContext, 'quote:delete'),
  
  // User-related permissions
  canManageUsers: (authContext: AuthContext) => 
    hasPermission(authContext, 'admin:users'),
  
  canViewUsers: (authContext: AuthContext) => 
    hasPermission(authContext, 'user:read_all'),
  
  // System-related permissions
  canAccessSystemHealth: (authContext: AuthContext) => 
    hasPermission(authContext, 'system:health'),
  
  canViewSystemMetrics: (authContext: AuthContext) => 
    hasPermission(authContext, 'system:metrics'),
  
  canViewSystemLogs: (authContext: AuthContext) => 
    hasPermission(authContext, 'system:logs'),
  
  // Service-specific permissions for VSR landing
  canManageServices: (authContext: AuthContext) => 
    hasAnyPermission(authContext, ['admin:services', 'admin:system']),
  
  canViewAnalytics: (authContext: AuthContext) => 
    hasAnyPermission(authContext, ['analytics:read', 'admin:system'])
};