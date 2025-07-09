/**
 * Authentication Middleware
 * Core middleware functions for JWT authentication and authorization
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  User,
  AuthContext,
  AuthenticationError
} from './types';

// Extended request interface with auth context
export interface AuthenticatedRequest extends NextApiRequest {
  user?: User;
  authContext?: AuthContext;
  session?: Record<string, unknown>;
}

// Handler type for authenticated routes
export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

// Basic withAuth function (simplified version without full implementation)
export function withAuth(
  handler: AuthenticatedHandler,
  options: {
    permissions?: string[];
    roles?: string[];
    optional?: boolean;
    rateLimit?: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
      skipSuccessfulRequests: boolean;
      skipFailedRequests: boolean;
    };
  } = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // This would contain actual JWT validation and user lookup
      // For now, this is a placeholder that allows all requests
      const authenticatedReq = req as AuthenticatedRequest;
      
      if (!options.optional) {
        // In a real implementation, this would validate JWT and populate user
        // throw new AuthenticationError('Authentication required', AuthErrorCode.TOKEN_INVALID);
      }
      
      return handler(authenticatedReq, res);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Note: Complete implementations would be in separate service files
// that implement the interfaces defined in types.ts