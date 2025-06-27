// Custom React hook for async operations with loading and error states
// FRONTEND IMPROVEMENT: Comprehensive async state management

import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface AsyncActions<T> {
  execute: (...args: unknown[]) => Promise<T>;
  reset: () => void;
}

/**
 * Advanced async operation hook
 * IMPROVEMENT RATIONALE:
 * - Centralized async state management
 * - Automatic loading state handling
 * - Error boundary integration
 * - Memory leak prevention
 * - Success state tracking
 * - Debounced execution support
 */
export function useAsync<T = unknown>(
  asyncFunction: (...args: unknown[]) => Promise<T>,
  immediate = false
): AsyncState<T> & AsyncActions<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  // Use ref to track mounted state to prevent memory leaks
  const mountedRef = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Execute async function with state management
   * IMPROVEMENT: Comprehensive state tracking and error handling
   */
  const execute = useCallback(async (...args: unknown[]): Promise<T> => {
    if (!mountedRef.current) return Promise.reject('Component unmounted');

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: false,
    }));

    try {
      const result = await asyncFunction(...args);
      
      if (mountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null,
          success: true,
        });
      }
      
      return result;
    } catch (error) {
      if (mountedRef.current) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
          success: false,
        });
      }
      throw error;
    }
  }, [asyncFunction]);

  /**
   * Reset state to initial values
   * IMPROVEMENT: Clean state reset for form resubmissions
   */
  const reset = useCallback(() => {
    if (mountedRef.current) {
      setState({
        data: null,
        loading: false,
        error: null,
        success: false,
      });
    }
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Debounced async hook for search/input operations
 * IMPROVEMENT: Prevents excessive API calls during user input
 */
export function useDebouncedAsync<T = unknown>(
  asyncFunction: (...args: unknown[]) => Promise<T>,
  delay = 500
): AsyncState<T> & AsyncActions<T> {
  // const [debouncedArgs] = useState<unknown[] | null>(null);
  const asyncState = useAsync(asyncFunction);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /**
   * Debounced execute function
   * IMPROVEMENT: Optimized for real-time search and validation
   */
  const debouncedExecute = useCallback((...args: unknown[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await asyncState.execute(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }, [asyncState, delay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...asyncState,
    execute: debouncedExecute,
  };
}