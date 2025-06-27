// Enhanced Input component with accessibility and validation
// FRONTEND IMPROVEMENT: Comprehensive form input with excellent UX

import React, { forwardRef, useId } from 'react';
import { InputProps } from '@/types';
import classNames from 'classnames';

/**
 * Enhanced Input component
 * IMPROVEMENTS:
 * - Full accessibility support (ARIA attributes, labels)
 * - Real-time validation feedback with visual indicators
 * - Consistent styling with design system
 * - Proper TypeScript typing
 * - Forward ref support for form libraries
 * - Built-in error state management
 */
const Input = forwardRef<HTMLInputElement, InputProps>(({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  autoComplete,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  /**
   * Input styling with state-based variants
   * IMPROVEMENT: Visual feedback for validation states
   */
  const inputClasses = classNames(
    // Base styles
    'w-full px-4 py-3 rounded-lg border transition-colors duration-200',
    'text-white bg-gray-700 placeholder-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
    
    // State-based styles
    {
      // Default state
      'border-gray-600 focus:border-blue-500 focus:ring-blue-500': !error && !disabled,
      
      // Error state
      'border-red-500 focus:border-red-500 focus:ring-red-500': error && !disabled,
      
      // Disabled state
      'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed': disabled,
    },
    className
  );

  /**
   * Label styling with required indicator
   * IMPROVEMENT: Clear visual hierarchy and required field indication
   */
  const labelClasses = classNames(
    'block text-sm font-medium mb-2 text-gray-200',
    {
      'text-gray-500': disabled,
    }
  );

  return (
    <div className="space-y-1">
      {/* Label with required indicator */}
      <label 
        htmlFor={inputId} 
        className={labelClasses}
      >
        {label}
        {required && (
          <span 
            className="text-red-400 ml-1" 
            aria-label="required field"
          >
            *
          </span>
        )}
      </label>

      {/* Input field */}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className={inputClasses}
        aria-invalid={!!error}
        aria-describedby={classNames(
          error && errorId,
          ariaDescribedBy,
          helperId
        ).trim() || undefined}
        {...props}
      />

      {/* Character counter for fields with maxLength */}
      {maxLength && (
        <div 
          id={helperId}
          className="text-xs text-gray-400 text-right"
          aria-live="polite"
        >
          {value.length}/{maxLength}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-red-400 flex items-center space-x-1"
        >
          <svg 
            className="w-4 h-4 flex-shrink-0" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;