/**
 * Authentication Context Provider
 * React context for managing authentication state across the application
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  User, 
  TokenPair,
  LoginRequest,
  RegisterRequest
} from '../auth/types';

// Authentication state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: TokenPair | null;
  permissions: string[];
  roles: string[];
  error: string | null;
}

// Authentication actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: TokenPair; permissions: string[]; roles: string[] } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User } }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: { tokens: TokenPair } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Authentication context interface
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: (logoutAll?: boolean) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  tokens: null,
  permissions: [],
  roles: [],
  error: null
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        permissions: action.payload.permissions,
        roles: action.payload.roles,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return {
        ...state,
        user: null,
        tokens: null,
        permissions: [],
        roles: [],
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };

    case 'REGISTER_SUCCESS':
      return {
        ...state,
        isLoading: false,
        error: null
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false
      };

    case 'REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        tokens: action.payload.tokens,
        error: null
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (state.tokens?.accessToken) {
      const refreshInterval = setInterval(() => {
        refreshToken().catch(console.error);
      }, 14 * 60 * 1000); // Refresh every 14 minutes (1 minute before expiry)

      return () => clearInterval(refreshInterval);
    }
  }, [state.tokens]);

  /**
   * Initialize authentication from stored tokens
   */
  const initializeAuth = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Try to get user profile using stored token
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: result.data,
              tokens: {
                accessToken: '', // Will be in HTTP-only cookie
                refreshToken: '',
                expiresIn: 900,
                tokenType: 'Bearer'
              },
              permissions: result.data.permissions || [],
              roles: result.data.roles || []
            }
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Login user
   */
  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      dispatch({ type: 'LOGIN_START' });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Get user profile to get permissions and roles
        const profileResponse = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include'
        });

        let permissions: string[] = [];
        let roles: string[] = [];

        if (profileResponse.ok) {
          const profileResult = await profileResponse.json();
          if (profileResult.success) {
            permissions = profileResult.data.permissions || [];
            roles = profileResult.data.roles || [];
          }
        }

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: result.data.user,
            tokens: result.data.tokens,
            permissions,
            roles
          }
        });
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = async (logoutAll: boolean = false): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ logoutAll })
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  /**
   * Register new user
   */
  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      dispatch({ type: 'REGISTER_START' });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        dispatch({
          type: 'REGISTER_SUCCESS',
          payload: {
            user: result.data.user
          }
        });
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'REGISTER_FAILURE', payload: message });
      throw error;
    }
  };

  /**
   * Refresh access token
   */
  const refreshToken = async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          dispatch({
            type: 'REFRESH_TOKEN_SUCCESS',
            payload: {
              tokens: result.data
            }
          });
        }
      } else if (response.status === 401) {
        // Refresh token expired, logout user
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // Don't dispatch error for refresh failures to avoid UI disruption
    }
  };

  /**
   * Clear error state
   */
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: string): boolean => {
    return state.permissions.includes(permission);
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role: string): boolean => {
    return state.roles.includes(role);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => state.permissions.includes(permission));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => state.permissions.includes(permission));
  };

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    register,
    refreshToken,
    clearError,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Optional auth hook (doesn't throw if no provider)
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext) || null;
}

// Custom hooks for specific auth checks
export function useUser(): User | null {
  const { state } = useAuth();
  return state.user;
}

export function useIsAuthenticated(): boolean {
  const { state } = useAuth();
  return state.isAuthenticated;
}

export function usePermissions(): string[] {
  const { state } = useAuth();
  return state.permissions;
}

export function useRoles(): string[] {
  const { state } = useAuth();
  return state.roles;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: string[],
  requiredRoles?: string[]
) {
  return function AuthenticatedComponent(props: P) {
    const { state, hasAnyPermission, hasRole } = useAuth();

    // Show loading spinner while checking auth
    if (state.isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    // Redirect to login if not authenticated
    if (!state.isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access this page.</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    // Check permissions if required
    if (requiredPermissions && !hasAnyPermission(requiredPermissions)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      );
    }

    // Check roles if required
    if (requiredRoles && !requiredRoles.some(role => hasRole(role))) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don&apos;t have the required role to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

export default AuthContext;