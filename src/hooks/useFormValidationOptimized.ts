// Optimized form validation hook with performance improvements
// FRONTEND IMPROVEMENT: Enhanced performance with debounced validation

import { useState, useCallback, useMemo, useRef } from 'react';
import { ValidationState, FieldValidation } from '@/types';
import { debounce } from '@/lib/ui-utils';

/**
 * Performance-optimized form validation hook
 * PERFORMANCE IMPROVEMENTS:
 * - Debounced validation to reduce excessive validation calls
 * - Memoized validation functions
 * - Optimized re-render prevention
 * - Efficient field state updates
 * 
 * UX IMPROVEMENTS:
 * - Configurable validation timing
 * - Better error message management
 * - Improved accessibility support
 */
export function useFormValidationOptimized<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: Record<keyof T, FieldValidation>,
  options: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    debounceMs?: number;
  } = {}
) {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    debounceMs = 300,
  } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Refs to prevent stale closure issues
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  /**
   * Memoized field validation function
   * Only recreates when validation rules change
   */
  const validateField = useMemo(() => {
    return (fieldName: keyof T, value: unknown): string | null => {
      const rules = validationRules[fieldName];
      if (!rules) return null;

      // Required field validation
      if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        return `${String(fieldName)} is required`;
      }

      // Skip other validations if field is empty and not required
      if (!value && !rules.required) return null;

      const stringValue = String(value);

      // Minimum length validation
      if (rules.minLength && stringValue.length < rules.minLength) {
        return `${String(fieldName)} must be at least ${rules.minLength} characters`;
      }

      // Maximum length validation
      if (rules.maxLength && stringValue.length > rules.maxLength) {
        return `${String(fieldName)} must be no more than ${rules.maxLength} characters`;
      }

      // Pattern validation (for email, phone, etc.)
      if (rules.pattern && !rules.pattern.test(stringValue)) {
        return `${String(fieldName)} format is invalid`;
      }

      // Custom validation function
      if (rules.customValidator) {
        return rules.customValidator(stringValue);
      }

      return null;
    };
  }, [validationRules]);

  /**
   * Debounced validation for performance
   * Reduces validation calls during rapid typing
   */
  const debouncedValidateField = useMemo(
    () => debounce((fieldName: keyof T, value: unknown) => {
      setIsValidating(true);
      const error = validateField(fieldName, value);
      
      setErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[String(fieldName)] = error;
        } else {
          delete newErrors[String(fieldName)];
        }
        return newErrors;
      });
      
      setIsValidating(false);
    }, debounceMs),
    [validateField, debounceMs]
  );

  /**
   * Immediate validation (for blur events)
   */
  const immediateValidateField = useCallback((fieldName: keyof T, value: unknown) => {
    const error = validateField(fieldName, value);
    
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[String(fieldName)] = error;
      } else {
        delete newErrors[String(fieldName)];
      }
      return newErrors;
    });
  }, [validateField]);

  /**
   * Validates all form fields
   * Optimized to only validate dirty fields if specified
   */
  const validateForm = useCallback((validateAll = true): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    const fieldsToValidate = validateAll 
      ? Object.keys(validationRules)
      : Object.keys(validationRules).filter(key => touched[key]);

    fieldsToValidate.forEach((fieldName) => {
      const error = validateField(fieldName as keyof T, valuesRef.current[fieldName as keyof T]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField, validationRules, touched]);

  /**
   * Optimized field update with selective validation
   */
  const updateField = useCallback((fieldName: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));

    // Only validate if field has been touched and validation on change is enabled
    if (touched[String(fieldName)] && validateOnChange) {
      debouncedValidateField(fieldName, value);
    }
  }, [touched, validateOnChange, debouncedValidateField]);

  /**
   * Enhanced touch field with validation control
   */
  const touchField = useCallback((fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Validate the field when it's touched (if blur validation is enabled)
    if (validateOnBlur) {
      immediateValidateField(fieldName, valuesRef.current[fieldName]);
    }
  }, [validateOnBlur, immediateValidateField]);

  /**
   * Batch update multiple fields (useful for form initialization)
   */
  const updateFields = useCallback((updates: Partial<T>) => {
    setValues(prev => ({ ...prev, ...updates }));
    
    // Validate updated fields if they're touched
    if (validateOnChange) {
      Object.entries(updates).forEach(([fieldName, value]) => {
        if (touched[fieldName]) {
          debouncedValidateField(fieldName as keyof T, value);
        }
      });
    }
  }, [touched, validateOnChange, debouncedValidateField]);

  /**
   * Optimized form reset
   */
  const resetForm = useCallback((newInitialValues?: Partial<T>) => {
    const resetValues = newInitialValues ? { ...initialValues, ...newInitialValues } : initialValues;
    setValues(resetValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsValidating(false);
  }, [initialValues]);

  /**
   * Enhanced form submission with better error handling
   */
  const handleSubmit = useCallback(async (
    onSubmit: (values: T) => Promise<void>,
    onError?: (error: Error) => void
  ) => {
    // Mark all fields as touched for validation display
    const allTouched = Object.keys(validationRules).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allTouched);

    // Wait for any pending validation
    await new Promise(resolve => setTimeout(resolve, debounceMs + 50));

    // Validate entire form
    if (!validateForm()) {
      return false;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(valuesRef.current);
      return true;
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, validationRules, debounceMs]);

  /**
   * Memoized validation state
   * Only recalculates when dependencies change
   */
  const validationState: ValidationState & { isValidating: boolean } = useMemo(() => ({
    isValid: Object.keys(errors).length === 0,
    errors,
    touched,
    isSubmitting,
    isValidating,
  }), [errors, touched, isSubmitting, isValidating]);

  /**
   * Memoized field props factory
   * Optimized to prevent unnecessary re-renders
   */
  const getFieldProps = useCallback((fieldName: keyof T) => {
    const fieldValue = values[fieldName];
    const fieldError = touched[String(fieldName)] ? errors[String(fieldName)] : undefined;
    
    return {
      value: fieldValue === null || fieldValue === undefined ? '' : String(fieldValue),
      onChange: (value: unknown) => updateField(fieldName, value),
      onBlur: () => touchField(fieldName),
      error: fieldError,
      'aria-invalid': !!fieldError,
      'aria-describedby': fieldError ? `${String(fieldName)}-error` : undefined,
    };
  }, [values, updateField, touchField, errors, touched]);

  /**
   * Get field error (memoized for performance)
   */
  const getFieldError = useCallback((fieldName: keyof T) => {
    return touched[String(fieldName)] ? errors[String(fieldName)] : undefined;
  }, [errors, touched]);

  /**
   * Check if field is dirty (different from initial value)
   */
  const isFieldDirty = useCallback((fieldName: keyof T) => {
    return values[fieldName] !== initialValues[fieldName];
  }, [values, initialValues]);

  /**
   * Check if form is dirty
   */
  const isFormDirty = useMemo(() => {
    return Object.keys(initialValues).some(key => 
      values[key as keyof T] !== initialValues[key as keyof T]
    );
  }, [values, initialValues]);

  return {
    values,
    validationState,
    updateField,
    updateFields,
    touchField,
    resetForm,
    handleSubmit,
    getFieldProps,
    getFieldError,
    validateForm,
    isFieldDirty,
    isFormDirty,
  };
}