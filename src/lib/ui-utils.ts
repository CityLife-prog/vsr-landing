/**
 * UI Utilities for consistent component patterns
 * FRONTEND IMPROVEMENT: Reduces repetitive code across UI components
 */

import classNames from 'classnames';

/**
 * Generate consistent field error props for form inputs
 * Eliminates repetitive accessibility attributes
 */
export const getFieldErrorProps = (fieldId: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${fieldId}-error` : undefined,
});

/**
 * Generate consistent error display props
 * Standardizes error message accessibility
 */
export const getErrorDisplayProps = (fieldId: string) => ({
  id: `${fieldId}-error`,
  role: 'alert' as const,
  'aria-live': 'polite' as const,
});

/**
 * Generate consistent helper text props
 * Standardizes helper text accessibility
 */
export const getHelperTextProps = (fieldId: string) => ({
  id: `${fieldId}-helper`,
  'aria-live': 'polite' as const,
});

/**
 * Standard focus ring classes for consistent focus indicators
 */
export const getFocusRingClasses = (color: 'blue' | 'red' | 'gray' = 'blue') => {
  const colorMap = {
    blue: 'focus:ring-blue-500 focus:border-blue-500',
    red: 'focus:ring-red-500 focus:border-red-500',
    gray: 'focus:ring-gray-500 focus:border-gray-500',
  };
  
  return classNames(
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
    colorMap[color]
  );
};

/**
 * Standard disabled state classes
 */
export const getDisabledClasses = () => 
  'opacity-50 cursor-not-allowed bg-gray-800 border-gray-700 text-gray-500';

/**
 * Generate consistent field wrapper classes
 */
export const getFieldWrapperClasses = (spacing: 'tight' | 'normal' | 'loose' = 'normal') => {
  const spacingMap = {
    tight: 'space-y-1',
    normal: 'space-y-2',
    loose: 'space-y-3',
  };
  
  return spacingMap[spacing];
};

/**
 * Generate label classes with consistent styling
 */
export const getLabelClasses = (disabled?: boolean, required?: boolean) => 
  classNames(
    'block text-sm font-medium mb-2',
    {
      'text-gray-200': !disabled,
      'text-gray-500': disabled,
    }
  );

/**
 * Generate required indicator classes and props
 */
export const getRequiredIndicatorProps = () => ({
  className: "text-red-400 ml-1",
  "aria-label": "required field",
  children: "*"
});

/**
 * Standard button base classes
 */
export const getButtonBaseClasses = () => 
  'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-95';

/**
 * Standard input base classes
 */
export const getInputBaseClasses = () => 
  'w-full px-4 py-3 rounded-lg border transition-colors duration-200 text-white bg-gray-700 placeholder-gray-400';

/**
 * Generate loading spinner props for JSX components
 */
export const getLoadingSpinnerProps = (size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeMap = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  
  return {
    className: classNames('animate-spin', sizeMap[size]),
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
    children: [
      {
        type: 'circle',
        props: {
          className: "opacity-25",
          cx: "12",
          cy: "12", 
          r: "10",
          stroke: "currentColor",
          strokeWidth: "4"
        }
      },
      {
        type: 'path',
        props: {
          className: "opacity-75",
          fill: "currentColor",
          d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        }
      }
    ]
  };
};

/**
 * Standard error icon props for JSX components
 */
export const getErrorIcon = () => ({
  className: "w-4 h-4 flex-shrink-0",
  fill: "currentColor",
  viewBox: "0 0 20 20",
  "aria-hidden": true,
  pathProps: {
    fillRule: "evenodd" as const,
    d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z",
    clipRule: "evenodd" as const
  }
});

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Generate consistent card classes
 */
export const getCardClasses = (variant: 'default' | 'elevated' | 'bordered' = 'default') => {
  const baseClasses = 'bg-gray-800 rounded-lg p-6';
  
  const variantMap = {
    default: '',
    elevated: 'shadow-lg hover:shadow-xl transition-shadow duration-200',
    bordered: 'border border-gray-700',
  };
  
  return classNames(baseClasses, variantMap[variant]);
};