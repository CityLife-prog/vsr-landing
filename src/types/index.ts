// Frontend TypeScript interfaces for VSR Landing
// FRONTEND IMPROVEMENT: Centralized type definitions for better type safety and maintainability

import { ReactNode } from 'react';

/**
 * Form validation state for real-time user feedback
 * IMPROVEMENT: Provides structured validation state management
 */
export interface ValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

/**
 * Job application form data structure
 * IMPROVEMENT: Type-safe form data handling
 */
export interface ApplicationFormData {
  name: string;
  email: string;
  phone: string;
  experience: string;
  resume: File[];
  [key: string]: unknown;
}

/**
 * Quote request form data structure
 * IMPROVEMENT: Type-safe form data with multiple file support
 */
export interface QuoteFormData {
  fullName: string;
  email: string;
  phone: string;
  service: string;
  details: string;
  photos: File[];
  [key: string]: unknown;
}

/**
 * API response structure for consistent error handling
 * IMPROVEMENT: Standardized API response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string[];
}

/**
 * Form field validation configuration
 * IMPROVEMENT: Reusable validation rules
 */
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => string | null;
}

/**
 * Loading state management for better UX
 * IMPROVEMENT: Centralized loading state handling
 */
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

/**
 * Notification system for user feedback
 * IMPROVEMENT: Consistent user messaging
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

/**
 * Component props for common UI elements
 * IMPROVEMENT: Reusable component interfaces
 */
export interface ButtonProps {
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}

export interface InputProps {
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'password' | 'number';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export interface TextareaProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export interface FileInputProps {
  id: string;
  name: string;
  label: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  required?: boolean;
  'aria-describedby'?: string;
}

/**
 * Service configuration for business logic
 * IMPROVEMENT: Type-safe service definitions
 */
export interface ServiceOption {
  id: string;
  name: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Mobile context interface for responsive design
 * IMPROVEMENT: Enhanced mobile detection
 */
export interface MobileContextValue {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Form submission hooks return type
 * IMPROVEMENT: Standardized hook interface
 */
export interface UseFormSubmission<T> {
  submitForm: (data: T) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

/**
 * File validation result
 * IMPROVEMENT: Detailed file validation feedback
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  file: File;
}

/**
 * Component error boundary state
 * IMPROVEMENT: Error handling for React components
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

/**
 * Performance monitoring types
 * IMPROVEMENT: Frontend performance tracking
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Accessibility helpers
 * IMPROVEMENT: A11y-focused interfaces
 */
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  role?: string;
}

/**
 * Google Analytics gtag types
 * IMPROVEMENT: Type-safe analytics tracking
 */
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'exception' | 'page_view',
      targetId: string,
      config?: {
        description?: string;
        fatal?: boolean;
        page_title?: string;
        page_location?: string;
        custom_parameter?: string;
        [key: string]: unknown;
      }
    ) => void;
  }
}