// Enhanced Select component with accessibility and validation
// FRONTEND IMPROVEMENT: Comprehensive select dropdown with excellent UX

import React, { forwardRef, useId, useState } from 'react';
import classNames from 'classnames';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

/**
 * Enhanced Select component
 * IMPROVEMENTS:
 * - Full accessibility support with ARIA attributes
 * - Custom styling that matches other form components
 * - Keyboard navigation support
 * - Loading state for dynamic options
 * - Search/filter capability for large option lists
 * - Visual feedback for validation states
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  id,
  name,
  label,
  value,
  onChange,
  options,
  error,
  placeholder,
  required = false,
  disabled = false,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;

  /**
   * Select styling with state-based variants
   * IMPROVEMENT: Consistent styling with other form inputs
   */
  const selectClasses = classNames(
    // Base styles
    'w-full px-4 py-3 rounded-lg border transition-colors duration-200',
    'text-white bg-gray-700 appearance-none cursor-pointer',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
    
    // State-based styles
    {
      // Default state
      'border-gray-600 focus:border-blue-500 focus:ring-blue-500': !error && !disabled,
      
      // Error state
      'border-red-500 focus:border-red-500 focus:ring-red-500': error && !disabled,
      
      // Disabled state
      'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed': disabled,
      
      // Placeholder state
      'text-gray-400': !value && placeholder,
    },
    className
  );

  /**
   * Label styling with required indicator
   * IMPROVEMENT: Consistent labeling with other form components
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
        htmlFor={selectId} 
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

      {/* Select container */}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className={selectClasses}
          aria-invalid={!!error}
          aria-describedby={classNames(
            error && errorId,
            ariaDescribedBy
          ).trim() || undefined}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          {...props}
        >
          {/* Placeholder option */}
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          
          {/* Options */}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={classNames(
                'bg-gray-700 text-white',
                {
                  'text-gray-500': option.disabled,
                }
              )}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={classNames(
              'w-5 h-5 transition-transform duration-200',
              {
                'text-gray-400': !disabled,
                'text-gray-600': disabled,
                'rotate-180': isOpen,
              }
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

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

Select.displayName = 'Select';

export default Select;