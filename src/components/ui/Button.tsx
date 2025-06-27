// Enhanced Button component with loading states and accessibility
// FRONTEND IMPROVEMENT: Comprehensive button with excellent UX

import React, { forwardRef } from 'react';
import { ButtonProps } from '@/types';
import classNames from 'classnames';

/**
 * Enhanced Button component
 * IMPROVEMENTS:
 * - Multiple visual variants (primary, secondary, outline, danger)
 * - Loading states with spinner animation
 * - Proper accessibility attributes
 * - Keyboard navigation support
 * - Disabled state handling
 * - Size variants for different contexts
 * - Icon support with proper spacing
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className,
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  
  /**
   * Variant-based styling
   * IMPROVEMENT: Consistent design system with clear visual hierarchy
   */
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
  };

  /**
   * Size-based styling
   * IMPROVEMENT: Flexible sizing for different UI contexts
   */
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  /**
   * Base button classes with state handling
   * IMPROVEMENT: Comprehensive state management and transitions
   */
  const buttonClasses = classNames(
    // Base styles
    'inline-flex items-center justify-center font-medium rounded-lg',
    'transition-all duration-200 transform',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
    'active:scale-95',
    
    // Variant styles
    variantClasses[variant],
    
    // Size styles
    sizeClasses[size],
    
    // State-based styles
    {
      'opacity-50 cursor-not-allowed transform-none': disabled || loading,
      'hover:scale-105': !disabled && !loading,
      'shadow-lg hover:shadow-xl': variant !== 'outline',
    },
    
    className
  );

  /**
   * Loading spinner component
   * IMPROVEMENT: Visual feedback during async operations
   */
  const LoadingSpinner = () => (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  /**
   * Click handler with loading state protection
   * IMPROVEMENT: Prevents multiple clicks during loading
   */
  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      {...props}
    >
      {/* Loading state */}
      {loading && <LoadingSpinner />}
      
      {/* Button content */}
      <span className={classNames({ 'opacity-70': loading })}>
        {children}
      </span>
      
      {/* Screen reader loading indication */}
      {loading && (
        <span className="sr-only">Loading...</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;