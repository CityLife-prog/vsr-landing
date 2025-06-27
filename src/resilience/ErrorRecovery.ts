/**
 * Error Recovery Strategies - Resilience Layer
 * Comprehensive error recovery patterns and strategies
 */

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  CIRCUIT_BREAKER = 'circuit_breaker',
  BULKHEAD = 'bulkhead',
  TIMEOUT = 'timeout',
  CACHE_FALLBACK = 'cache_fallback',
  DEFAULT_VALUE = 'default_value',
  QUEUE_FOR_LATER = 'queue_for_later',
  ALTERNATIVE_SERVICE = 'alternative_service'
}

export interface RecoveryConfig {
  strategies: RecoveryStrategy[];
  maxRecoveryAttempts: number;
  recoveryTimeout: number;
  enableLogging: boolean;
  enableMetrics: boolean;
  fallbackValue?: any;
  cacheKey?: string;
  queueName?: string;
  alternativeEndpoint?: string;
  onRecovery?: (strategy: RecoveryStrategy, error: Error, result: any) => void;
  onFailure?: (error: Error, attemptedStrategies: RecoveryStrategy[]) => void;
}

export interface RecoveryResult<T> {
  success: boolean;
  result?: T;
  strategy?: RecoveryStrategy;
  attempts: number;
  totalTime: number;
  errors: Error[];
  fallbackUsed: boolean;
}

export interface RecoveryAttempt {
  strategy: RecoveryStrategy;
  timestamp: number;
  success: boolean;
  duration: number;
  error?: Error;
  result?: any;
}

export class ErrorRecoveryManager {
  private attempts: RecoveryAttempt[] = [];
  private config: Required<RecoveryConfig>;
  private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
  private queue = new Map<string, any[]>();

  constructor(config: RecoveryConfig) {
    this.config = {
      strategies: [RecoveryStrategy.RETRY, RecoveryStrategy.FALLBACK],
      maxRecoveryAttempts: 3,
      recoveryTimeout: 30000,
      enableLogging: true,
      enableMetrics: true,
      fallbackValue: null,
      cacheKey: '',
      queueName: 'default',
      alternativeEndpoint: '',
      onRecovery: () => {},
      onFailure: () => {},
      ...config
    };
  }

  async executeWithRecovery<T>(
    primaryOperation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let lastError: Error;

    // Try primary operation first
    try {
      const result = await this.withTimeout(primaryOperation(), this.config.recoveryTimeout);
      return {
        success: true,
        result,
        attempts: 1,
        totalTime: Date.now() - startTime,
        errors: [],
        fallbackUsed: false
      };
    } catch (error) {
      lastError = error as Error;
      errors.push(lastError);
      
      if (this.config.enableLogging) {
        console.warn(`Primary operation failed for ${operationName}:`, error);
      }
    }

    // Apply recovery strategies
    for (let attempt = 1; attempt <= this.config.maxRecoveryAttempts; attempt++) {
      for (const strategy of this.config.strategies) {
        const attemptStartTime = Date.now();
        
        try {
          const result = await this.applyRecoveryStrategy(
            strategy,
            primaryOperation,
            lastError,
            operationName
          );

          if (result !== undefined) {
            const recoveryAttempt: RecoveryAttempt = {
              strategy,
              timestamp: attemptStartTime,
              success: true,
              duration: Date.now() - attemptStartTime,
              result
            };

            this.attempts.push(recoveryAttempt);
            
            if (this.config.enableLogging) {
              console.log(`Recovery successful using ${strategy} for ${operationName}`);
            }

            if (this.config.onRecovery) {
              this.config.onRecovery(strategy, lastError, result);
            }

            return {
              success: true,
              result,
              strategy,
              attempts: attempt,
              totalTime: Date.now() - startTime,
              errors,
              fallbackUsed: strategy !== RecoveryStrategy.RETRY
            };
          }
        } catch (recoveryError) {
          const recoveryAttempt: RecoveryAttempt = {
            strategy,
            timestamp: attemptStartTime,
            success: false,
            duration: Date.now() - attemptStartTime,
            error: recoveryError as Error
          };

          this.attempts.push(recoveryAttempt);
          errors.push(recoveryError as Error);
          
          if (this.config.enableLogging) {
            console.warn(`Recovery strategy ${strategy} failed for ${operationName}:`, recoveryError);
          }
        }
      }
    }

    // All recovery strategies failed
    if (this.config.onFailure) {
      this.config.onFailure(lastError, this.config.strategies);
    }

    return {
      success: false,
      attempts: this.config.maxRecoveryAttempts,
      totalTime: Date.now() - startTime,
      errors,
      fallbackUsed: true
    };
  }

  private async applyRecoveryStrategy<T>(
    strategy: RecoveryStrategy,
    primaryOperation: () => Promise<T>,
    error: Error,
    operationName: string
  ): Promise<T | undefined> {
    switch (strategy) {
      case RecoveryStrategy.RETRY:
        return this.retryStrategy(primaryOperation);

      case RecoveryStrategy.FALLBACK:
        return this.fallbackStrategy();

      case RecoveryStrategy.GRACEFUL_DEGRADATION:
        return this.gracefulDegradationStrategy(operationName);

      case RecoveryStrategy.CACHE_FALLBACK:
        return this.cacheFallbackStrategy();

      case RecoveryStrategy.DEFAULT_VALUE:
        return this.defaultValueStrategy();

      case RecoveryStrategy.QUEUE_FOR_LATER:
        return this.queueForLaterStrategy(primaryOperation, operationName);

      case RecoveryStrategy.ALTERNATIVE_SERVICE:
        return this.alternativeServiceStrategy(operationName);

      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`);
    }
  }

  private async retryStrategy<T>(operation: () => Promise<T>): Promise<T> {
    // Simple retry with exponential backoff
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, i);
        await this.delay(delay);
      }
    }

    throw new Error('Retry strategy failed');
  }

  private async fallbackStrategy<T>(): Promise<T> {
    if (this.config.fallbackValue !== undefined) {
      return this.config.fallbackValue;
    }
    throw new Error('No fallback value configured');
  }

  private async gracefulDegradationStrategy<T>(operationName: string): Promise<T> {
    // Return a degraded version of the service
    const degradedResponses = new Map([
      ['getUserProfile', { name: 'Guest User', preferences: {} }],
      ['getRecommendations', []],
      ['getAnalytics', { views: 0, clicks: 0 }],
      ['getQuotes', []],
      ['getProjects', []]
    ]);

    const degradedResponse = degradedResponses.get(operationName);
    if (degradedResponse !== undefined) {
      return degradedResponse as T;
    }

    throw new Error(`No graceful degradation available for ${operationName}`);
  }

  private async cacheFallbackStrategy<T>(): Promise<T> {
    if (!this.config.cacheKey) {
      throw new Error('No cache key configured for cache fallback');
    }

    const cached = this.cache.get(this.config.cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.value;
    }

    throw new Error('No valid cached value available');
  }

  private async defaultValueStrategy<T>(): Promise<T> {
    // Return sensible defaults based on common operation types
    const defaults = new Map([
      ['array', []],
      ['object', {}],
      ['string', ''],
      ['number', 0],
      ['boolean', false]
    ]);

    if (this.config.fallbackValue !== undefined) {
      return this.config.fallbackValue;
    }

    // Try to infer default based on operation context
    return defaults.get('object') || {} as T;
  }

  private async queueForLaterStrategy<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Queue the operation for later processing
    const queueName = this.config.queueName || 'default';
    
    if (!this.queue.has(queueName)) {
      this.queue.set(queueName, []);
    }

    this.queue.get(queueName)!.push({
      operation,
      operationName,
      timestamp: Date.now()
    });

    // Return a receipt or acknowledgment
    return {
      queued: true,
      queueName,
      operationName,
      timestamp: Date.now()
    } as T;
  }

  private async alternativeServiceStrategy<T>(operationName: string): Promise<T> {
    if (!this.config.alternativeEndpoint) {
      throw new Error('No alternative endpoint configured');
    }

    // This would typically make a request to an alternative service
    // For now, return a placeholder response
    throw new Error('Alternative service strategy not implemented for this operation');
  }

  // Cache management
  setCacheValue(key: string, value: any, ttl: number = 300000): void { // 5 minutes default TTL
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  getCacheValue(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.value;
    }
    return undefined;
  }

  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // Queue management
  processQueue(queueName: string = 'default'): void {
    const queue = this.queue.get(queueName);
    if (!queue) return;

    // Process queued operations
    queue.forEach(async (item) => {
      try {
        await item.operation();
        console.log(`Successfully processed queued operation: ${item.operationName}`);
      } catch (error) {
        console.error(`Failed to process queued operation: ${item.operationName}`, error);
      }
    });

    // Clear the queue
    this.queue.set(queueName, []);
  }

  getQueueLength(queueName: string = 'default'): number {
    return this.queue.get(queueName)?.length || 0;
  }

  // Utility methods
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Metrics and monitoring
  getRecoveryMetrics() {
    const totalAttempts = this.attempts.length;
    const successfulAttempts = this.attempts.filter(a => a.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;

    const strategyUsage = this.attempts.reduce((acc, attempt) => {
      acc[attempt.strategy] = (acc[attempt.strategy] || 0) + 1;
      return acc;
    }, {} as Record<RecoveryStrategy, number>);

    const averageDuration = totalAttempts > 0
      ? this.attempts.reduce((sum, a) => sum + a.duration, 0) / totalAttempts
      : 0;

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0,
      strategyUsage,
      averageDuration,
      cacheSize: this.cache.size,
      queueSizes: Object.fromEntries(
        Array.from(this.queue.entries()).map(([name, queue]) => [name, queue.length])
      )
    };
  }

  getAttempts(): RecoveryAttempt[] {
    return [...this.attempts];
  }

  reset(): void {
    this.attempts = [];
    this.cache.clear();
    this.queue.clear();
  }
}

// Factory for creating recovery managers with common configurations
export class RecoveryStrategyFactory {
  static createWebServiceRecovery(config?: Partial<RecoveryConfig>): ErrorRecoveryManager {
    return new ErrorRecoveryManager({
      strategies: [
        RecoveryStrategy.RETRY,
        RecoveryStrategy.CACHE_FALLBACK,
        RecoveryStrategy.GRACEFUL_DEGRADATION,
        RecoveryStrategy.DEFAULT_VALUE
      ],
      maxRecoveryAttempts: 3,
      recoveryTimeout: 15000,
      enableLogging: true,
      enableMetrics: true,
      ...config
    });
  }

  static createDatabaseRecovery(config?: Partial<RecoveryConfig>): ErrorRecoveryManager {
    return new ErrorRecoveryManager({
      strategies: [
        RecoveryStrategy.RETRY,
        RecoveryStrategy.CACHE_FALLBACK,
        RecoveryStrategy.QUEUE_FOR_LATER
      ],
      maxRecoveryAttempts: 5,
      recoveryTimeout: 30000,
      enableLogging: true,
      enableMetrics: true,
      ...config
    });
  }

  static createApiRecovery(config?: Partial<RecoveryConfig>): ErrorRecoveryManager {
    return new ErrorRecoveryManager({
      strategies: [
        RecoveryStrategy.RETRY,
        RecoveryStrategy.ALTERNATIVE_SERVICE,
        RecoveryStrategy.CACHE_FALLBACK,
        RecoveryStrategy.GRACEFUL_DEGRADATION
      ],
      maxRecoveryAttempts: 3,
      recoveryTimeout: 20000,
      enableLogging: true,
      enableMetrics: true,
      ...config
    });
  }

  static createFileOperationRecovery(config?: Partial<RecoveryConfig>): ErrorRecoveryManager {
    return new ErrorRecoveryManager({
      strategies: [
        RecoveryStrategy.RETRY,
        RecoveryStrategy.QUEUE_FOR_LATER,
        RecoveryStrategy.DEFAULT_VALUE
      ],
      maxRecoveryAttempts: 3,
      recoveryTimeout: 60000,
      enableLogging: true,
      enableMetrics: true,
      ...config
    });
  }
}

// Decorator for automatic error recovery
export function WithRecovery(config: RecoveryConfig) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const recoveryManager = new ErrorRecoveryManager(config);

    descriptor.value = async function (...args: any[]) {
      const result = await recoveryManager.executeWithRecovery(
        () => method.apply(this, args),
        propertyName
      );

      if (result.success) {
        return result.result;
      } else {
        throw new Error(`All recovery strategies failed for ${propertyName}`);
      }
    };

    return descriptor;
  };
}

// React hook for error recovery
export function useErrorRecovery(config?: RecoveryConfig) {
  const [recoveryManager] = React.useState(() => 
    config ? new ErrorRecoveryManager(config) : RecoveryStrategyFactory.createWebServiceRecovery()
  );

  const [isRecovering, setIsRecovering] = React.useState(false);
  const [lastRecovery, setLastRecovery] = React.useState<RecoveryResult<any> | null>(null);

  const executeWithRecovery = React.useCallback(async <T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    setIsRecovering(true);
    
    try {
      const result = await recoveryManager.executeWithRecovery(operation, operationName);
      setLastRecovery(result);
      
      if (result.success) {
        return result.result!;
      } else {
        throw new Error('All recovery strategies failed');
      }
    } finally {
      setIsRecovering(false);
    }
  }, [recoveryManager]);

  const getMetrics = React.useCallback(() => {
    return recoveryManager.getRecoveryMetrics();
  }, [recoveryManager]);

  return {
    executeWithRecovery,
    isRecovering,
    lastRecovery,
    getMetrics,
    setCacheValue: recoveryManager.setCacheValue.bind(recoveryManager),
    processQueue: recoveryManager.processQueue.bind(recoveryManager)
  };
}

import React from 'react';