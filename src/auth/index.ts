/**
 * Authentication System - Main Export
 * Comprehensive authentication, authorization, and security system
 */

// Core types and interfaces
export * from './types';

// Authentication decorators and components
export {
  AuthProvider,
  useAuth,
  useOptionalAuth,
  usePermissions,
  useRoles,
  useUser,
  useIsAuthenticated,
  requireAuth,
  AuthenticatedOnly,
  UnauthenticatedOnly,
  
  // Decorators for routes
  authenticated,
  optionalAuth,
  adminOnly,
  managerLevel,
  userLevel,
  rateLimited,
  requirePermissions,
  requireRoles,
  secureRoute,
  createProtectedHandler,
  
  // Utility functions
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  getUserDisplayName,
  isAdmin,
  isManager,
  canManageUsers,
  canApproveQuotes,
  VSRPermissions
} from './decorators';

// Re-export AuthGuard from decorators (avoiding conflict with types)
export { AuthGuard as AuthGuardComponent } from './decorators';

// Middleware functions
export * from './middleware';

// Usage examples (optional - remove in production)
// Examples have been moved to examples.ts.bak due to incomplete implementations

// Note: Implementation files (like services, managers, etc.) would be separate
// and would import from this module to use the types and interfaces.