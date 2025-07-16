/**
 * Admin API Request/Response Type Definitions
 * Centralized types for admin API endpoints
 */

import { NextApiRequest } from 'next';
import { AdminUser, EmployeeAccount } from './admin';

// Base Admin API Request interface
export interface AdminApiRequest<T = any> extends NextApiRequest {
  body: T;
}

// Auth Endpoint Request Types
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminChangePasswordRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface AdminResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AdminRequestResetRequest {
  email: string;
}

export interface AdminVerifyEmailRequest {
  token: string;
}

// Management Endpoint Request Types
export interface CreateUserRequest {
  userData: Partial<AdminUser>;
}

export interface UpdateUserRequest {
  updates: Partial<AdminUser>;
}

export interface ApproveEmployeeRequest {
  notes?: string;
}

export interface RejectEmployeeRequest {
  reason: string;
}

export interface BulkActionsRequest {
  action: 'approve_employees' | 'reject_employees' | 'delete_users' | 'activate_users' | 'deactivate_users';
  targets: string[];
  data?: Record<string, any>;
}

// Query Parameter Types
export interface AdminUsersQuery {
  userId?: string;
}

export interface AdminEmployeesQuery {
  employeeId?: string;
  action?: 'pending' | 'approve' | 'reject';
}

// Response Type Definitions
export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  user?: AdminUser;
  message: string;
  requiresPasswordReset?: boolean;
  passwordResetToken?: string;
}

export interface AdminPasswordResetResponse {
  success: boolean;
  message: string;
}

export interface AdminVerifyEmailResponse {
  success: boolean;
  message: string;
}

export interface AdminUsersResponse {
  success: boolean;
  users?: AdminUser[];
  user?: AdminUser;
  message?: string;
  total?: number;
}

export interface AdminEmployeesResponse {
  success: boolean;
  employees?: EmployeeAccount[];
  employee?: EmployeeAccount;
  message?: string;
  total?: number;
}

export interface AdminDashboardResponse {
  success: boolean;
  stats?: {
    totalUsers: number;
    totalEmployees: number;
    pendingApprovals: number;
    activeAdmins: number;
  };
  recentActivity?: Array<{
    id: string;
    action: string;
    timestamp: Date;
    user: string;
  }>;
  message?: string;
}

export interface AdminBulkActionsResponse {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
  message: string;
}

// Error Response Types
export interface AdminApiError {
  success: false;
  message: string;
  error: string;
  details?: any;
}

// Validation Helpers
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password && password.length >= 8;
}

export function isValidToken(token: string): boolean {
  return token && token.length >= 16;
}

// Request Validation Functions
export function validateLoginRequest(body: any): body is AdminLoginRequest {
  return body && 
         typeof body.email === 'string' && 
         typeof body.password === 'string' &&
         isValidEmail(body.email) &&
         body.password.length >= 3;
}

export function validateChangePasswordRequest(body: any): body is AdminChangePasswordRequest {
  return body &&
         typeof body.email === 'string' &&
         typeof body.currentPassword === 'string' &&
         typeof body.newPassword === 'string' &&
         isValidEmail(body.email) &&
         isValidPassword(body.newPassword);
}

export function validateResetPasswordRequest(body: any): body is AdminResetPasswordRequest {
  return body &&
         typeof body.token === 'string' &&
         typeof body.newPassword === 'string' &&
         isValidToken(body.token) &&
         isValidPassword(body.newPassword);
}

export function validateRequestResetRequest(body: any): body is AdminRequestResetRequest {
  return body &&
         typeof body.email === 'string' &&
         isValidEmail(body.email);
}

export function validateVerifyEmailRequest(body: any): body is AdminVerifyEmailRequest {
  return body &&
         typeof body.token === 'string' &&
         isValidToken(body.token);
}

export function validateBulkActionsRequest(body: any): body is BulkActionsRequest {
  const validActions = ['approve_employees', 'reject_employees', 'delete_users', 'activate_users', 'deactivate_users'];
  return body &&
         typeof body.action === 'string' &&
         validActions.includes(body.action) &&
         Array.isArray(body.targets) &&
         body.targets.length > 0;
}