/**
 * Retry Logic with Exponential Backoff - Resilience Layer
 * Comprehensive retry strategies for handling transient failures
 */

export enum RetryStrategy {
  FIXED_DELAY = 'fixed_delay',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  JITTERED_BACKOFF = 'jittered_backoff',
  FIBONACCI_BACKOFF = 'fibonacci_backoff'
}

export interface RetryConfig {
  maxAttempts: number;
  strategy?: RetryStrategy;
  baseDelay?: number;              // Base delay in milliseconds
  maxDelay?: number;               // Maximum delay in milliseconds
  multiplier?: number;             // Multiplier for exponential backoff
  jitter?: boolean;                // Add randomness to delays
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  timeout?: number;               // Overall timeout for all attempts
  abortSignal?: AbortSignal;      // Support for cancellation
  name?: string;                  // Identifier for monitoring
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
  errors: Error[];
  success: boolean;
}

export interface RetryAttempt {
  attempt: number;
  timestamp: number;
  delay: number;
  error?: Error;
  success: boolean;
  duration: number;
}

export class RetryManager {
  private static readonly DEFAULT_CONFIG: Required<Omit<RetryConfig, 'abortSignal'>> = {
    maxAttempts: 3,
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    baseDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
    retryCondition: (error) => RetryManager.isRetryableError(error),
    onRetry: () => {},
    timeout: 300000, // 5 minutes
    name: 'default'
  };

  private attempts: RetryAttempt[] = [];
  private config: Required<Omit<RetryConfig, 'abortSignal'>> & { abortSignal?: AbortSignal };

  constructor(config: RetryConfig) {
    this.config = { ...RetryManager.DEFAULT_CONFIG, ...config };
  }

  async execute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let lastError: Error;

    // Check for immediate abort
    if (this.config.abortSignal?.aborted) {
      throw new RetryAbortedError('Retry operation was aborted before starting');
    }

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      const attemptStartTime = Date.now();

      // Check timeout
      if (this.config.timeout && (Date.now() - startTime) >= this.config.timeout) {
        throw new RetryTimeoutError(
          `Retry operation timed out after ${this.config.timeout}ms`,
          errors,
          attempt - 1
        );
      }

      // Check abort signal
      if (this.config.abortSignal?.aborted) {
        throw new RetryAbortedError('Retry operation was aborted', errors, attempt - 1);
      }

      try {
        const result = await operation();
        const duration = Date.now() - attemptStartTime;

        // Record successful attempt
        this.attempts.push({
          attempt,
          timestamp: attemptStartTime,
          delay: 0,
          success: true,
          duration
        });

        return {
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          errors,
          success: true
        };

      } catch (error) {
        lastError = error as Error;
        errors.push(lastError);
        
        const duration = Date.now() - attemptStartTime;
        const delay = this.calculateDelay(attempt);

        // Record failed attempt
        this.attempts.push({
          attempt,
          timestamp: attemptStartTime,
          delay,
          error: lastError,
          success: false,
          duration
        });

        // Check if we should retry
        const shouldRetry = 
          attempt < this.config.maxAttempts &&
          this.config.retryCondition(lastError, attempt);

        if (!shouldRetry) {
          break;
        }

        // Call retry callback
        this.config.onRetry(lastError, attempt, delay);

        // Wait before next attempt
        if (delay > 0) {
          await this.delay(delay);
        }
      }
    }

    // All attempts failed
    throw new RetryExhaustedError(
      `All retry attempts exhausted. Last error: ${lastError!.message}`,
      errors,
      this.config.maxAttempts
    );
  }

  private calculateDelay(attempt: number): number {
    if (attempt >= this.config.maxAttempts) {
      return 0; // No delay for the last attempt
    }

    let delay: number;

    switch (this.config.strategy) {
      case RetryStrategy.FIXED_DELAY:
        delay = this.config.baseDelay;
        break;

      case RetryStrategy.LINEAR_BACKOFF:
        delay = this.config.baseDelay * attempt;
        break;

      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = this.config.baseDelay * Math.pow(this.config.multiplier, attempt - 1);
        break;

      case RetryStrategy.FIBONACCI_BACKOFF:
        delay = this.config.baseDelay * this.fibonacci(attempt);
        break;

      case RetryStrategy.JITTERED_BACKOFF:
        const exponential = this.config.baseDelay * Math.pow(this.config.multiplier, attempt - 1);
        delay = exponential * (0.5 + Math.random() * 0.5); // 50-100% of exponential delay
        break;

      default:
        delay = this.config.baseDelay;
    }

    // Apply jitter if enabled
    if (this.config.jitter && this.config.strategy !== RetryStrategy.JITTERED_BACKOFF) {
      const jitterRange = delay * 0.1; // ±10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    // Ensure delay is within bounds
    return Math.min(Math.max(delay, 0), this.config.maxDelay);
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    if (n === 2) return 1;
    
    let a = 1, b = 1;
    for (let i = 3; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      
      // Support cancellation
      if (this.config.abortSignal) {
        const abortHandler = () => {
          clearTimeout(timeout);
          reject(new RetryAbortedError('Retry delay was aborted'));
        };
        
        this.config.abortSignal.addEventListener('abort', abortHandler, { once: true });
      }
    });
  }

  static isRetryableError(error: Error): boolean {
    // Network and temporary errors are retryable
    const retryableMessages = [
      'network',
      'timeout',
      'connection',
      'temporary',
      'unavailable',
      'rate limit',
      'throttle',
      'too many requests',
      'service overloaded',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];

    const message = error.message.toLowerCase();
    return retryableMessages.some(msg => message.includes(msg));
  }

  getAttempts(): RetryAttempt[] {
    return [...this.attempts];
  }

  getMetrics() {
    const totalAttempts = this.attempts.length;
    const successfulAttempts = this.attempts.filter(a => a.success).length;
    const totalDelay = this.attempts.reduce((sum, a) => sum + a.delay, 0);
    const totalDuration = this.attempts.reduce((sum, a) => sum + a.duration, 0);

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts: totalAttempts - successfulAttempts,
      successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0,
      averageDelay: totalAttempts > 0 ? totalDelay / totalAttempts : 0,
      averageDuration: totalAttempts > 0 ? totalDuration / totalAttempts : 0,
      totalTime: totalDelay + totalDuration
    };
  }
}

// Factory for creating retry managers with common configurations
export class RetryFactory {
  static createDatabaseRetry(customConfig?: Partial<RetryConfig>): RetryManager {
    return new RetryManager({
      maxAttempts: 3,
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      baseDelay: 500,
      maxDelay: 5000,
      multiplier: 2,
      jitter: true,
      retryCondition: (error) => {
        // Retry connection errors, timeouts, but not constraint violations
        const retryable = RetryManager.isRetryableError(error);
        const isConstraintError = error.message.includes('constraint') || 
                                error.message.includes('duplicate') ||
                                error.message.includes('validation');
        return retryable && !isConstraintError;
      },
      name: 'database',
      ...customConfig
    });
  }

  static createApiRetry(customConfig?: Partial<RetryConfig>): RetryManager {
    return new RetryManager({
      maxAttempts: 5,
      strategy: RetryStrategy.JITTERED_BACKOFF,
      baseDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
      retryCondition: (error) => {
        // Retry 5xx errors and network issues, but not 4xx client errors
        const is5xxError = error.message.includes('5') && 
                          (error.message.includes('500') || error.message.includes('502') || 
                           error.message.includes('503') || error.message.includes('504'));
        return RetryManager.isRetryableError(error) || is5xxError;
      },
      name: 'api',
      ...customConfig
    });
  }

  static createFileUploadRetry(customConfig?: Partial<RetryConfig>): RetryManager {
    return new RetryManager({
      maxAttempts: 3,
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      baseDelay: 2000,
      maxDelay: 20000,
      multiplier: 3,
      jitter: true,
      timeout: 120000, // 2 minutes total
      retryCondition: (error) => {
        // Retry network errors but not file validation errors
        const isValidationError = error.message.includes('file size') ||
                                error.message.includes('file type') ||
                                error.message.includes('invalid file');
        return RetryManager.isRetryableError(error) && !isValidationError;
      },
      name: 'file-upload',
      ...customConfig
    });
  }

  static createEmailRetry(customConfig?: Partial<RetryConfig>): RetryManager {
    return new RetryManager({
      maxAttempts: 3,
      strategy: RetryStrategy.LINEAR_BACKOFF,
      baseDelay: 5000,
      maxDelay: 30000,
      multiplier: 1,
      jitter: false,
      retryCondition: (error) => {
        // Retry temporary email service issues
        const retryableEmailErrors = [
          'rate limit',
          'quota exceeded',
          'service unavailable',
          'temporary failure'
        ];
        const message = error.message.toLowerCase();
        return retryableEmailErrors.some(msg => message.includes(msg));
      },
      name: 'email',
      ...customConfig
    });
  }
}

// Retry-specific errors
export class RetryError extends Error {
  constructor(
    message: string,
    public readonly errors: Error[],
    public readonly attempts: number
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export class RetryExhaustedError extends RetryError {
  constructor(message: string, errors: Error[], attempts: number) {
    super(message, errors, attempts);
    this.name = 'RetryExhaustedError';
  }
}

export class RetryTimeoutError extends RetryError {
  constructor(message: string, errors: Error[], attempts: number) {
    super(message, errors, attempts);
    this.name = 'RetryTimeoutError';
  }
}

export class RetryAbortedError extends RetryError {
  constructor(message: string, errors: Error[] = [], attempts: number = 0) {
    super(message, errors, attempts);
    this.name = 'RetryAbortedError';
  }
}

// Utility functions for common retry patterns
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retryManager = new RetryManager({
    maxAttempts: 3,
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    baseDelay: 1000,
    maxDelay: 10000,
    multiplier: 2,
    jitter: true,
    ...config
  });

  const result = await retryManager.execute(operation);
  return result.result;
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>): Promise<T> {
  const retryManager = RetryFactory.createDatabaseRetry();
  const result = await retryManager.execute(operation);
  return result.result;
}

export async function withApiRetry<T>(operation: () => Promise<T>): Promise<T> {
  const retryManager = RetryFactory.createApiRetry();
  const result = await retryManager.execute(operation);
  return result.result;
}

// Decorator for automatic retry functionality
export function Retryable(config: Partial<RetryConfig> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
        baseDelay: 1000,
        maxDelay: 10000,
        multiplier: 2,
        jitter: true,
        ...config
      });

      const result = await retryManager.execute(() => method.apply(this, args));
      return result.result;
    };

    return descriptor;
  };
}

// React hook for retry functionality
export function useRetry() {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [lastError, setLastError] = React.useState<Error | null>(null);

  const executeWithRetry = React.useCallback(async <T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> => {
    setIsRetrying(true);
    setRetryCount(0);
    setLastError(null);

    try {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
        baseDelay: 1000,
        maxDelay: 10000,
        multiplier: 2,
        jitter: true,
        onRetry: (error, attempt) => {
          setRetryCount(attempt);
          setLastError(error);
        },
        ...config
      });

      const result = await retryManager.execute(operation);
      return result.result;
    } finally {
      setIsRetrying(false);
    }
  }, []);

  return {
    executeWithRetry,
    isRetrying,
    retryCount,
    lastError
  };
}

import React from 'react';