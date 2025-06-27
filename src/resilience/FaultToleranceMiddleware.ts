/**
 * Fault Tolerance Middleware - Resilience Layer
 * Middleware components for handling faults across the application stack
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { CircuitBreaker, CircuitBreakerFactory } from './CircuitBreaker';
import { RetryManager, RetryFactory } from './RetryLogic';
import { ErrorRecoveryManager, RecoveryStrategyFactory } from './ErrorRecovery';

export interface FaultToleranceConfig {
  enableCircuitBreaker: boolean;
  enableRetry: boolean;
  enableErrorRecovery: boolean;
  enableRateLimiting: boolean;
  enableTimeout: boolean;
  enableBulkhead: boolean;
  enableMonitoring: boolean;
  circuitBreakerConfig?: any;
  retryConfig?: any;
  recoveryConfig?: any;
  timeoutMs: number;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  bulkheadMaxConcurrent: number;
  monitoringConfig?: any;
}

export interface MiddlewareContext {
  request: NextApiRequest;
  response: NextApiResponse;
  startTime: number;
  operationId: string;
  metadata: Record<string, any>;
}

export interface MiddlewareResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  metadata: {
    duration: number;
    strategy?: string;
    attempts: number;
    circuitBreakerState?: string;
    fromCache: boolean;
    rateLimited: boolean;
    bulkheadQueued: boolean;
  };
}

export type MiddlewareHandler<T = any> = (
  context: MiddlewareContext
) => Promise<T>;

export class FaultToleranceMiddleware {
  private config: Required<FaultToleranceConfig>;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private retryManagers = new Map<string, RetryManager>();
  private recoveryManagers = new Map<string, ErrorRecoveryManager>();
  private rateLimiters = new Map<string, RateLimiter>();
  private bulkheads = new Map<string, BulkheadIsolation>();
  private activeOperations = new Map<string, number>();

  constructor(config: Partial<FaultToleranceConfig> = {}) {
    this.config = {
      enableCircuitBreaker: true,
      enableRetry: true,
      enableErrorRecovery: true,
      enableRateLimiting: true,
      enableTimeout: true,
      enableBulkhead: true,
      enableMonitoring: true,
      circuitBreakerConfig: {},
      retryConfig: {},
      recoveryConfig: {},
      timeoutMs: 30000,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMaxRequests: 100,
      bulkheadMaxConcurrent: 10,
      monitoringConfig: {},
      ...config
    };
  }

  // Main middleware wrapper
  async executeWithFaultTolerance<T>(
    operationName: string,
    operation: MiddlewareHandler<T>,
    context: MiddlewareContext
  ): Promise<MiddlewareResult<T>> {
    const startTime = Date.now();
    const operationId = `${operationName}_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
    
    const enhancedContext = {
      ...context,
      operationId,
      startTime
    };

    try {
      // Apply rate limiting
      if (this.config.enableRateLimiting) {
        await this.applyRateLimit(operationName, context.request);
      }

      // Apply bulkhead isolation
      if (this.config.enableBulkhead) {
        await this.applyBulkhead(operationName);
      }

      // Execute with circuit breaker
      if (this.config.enableCircuitBreaker) {
        const result = await this.executeWithCircuitBreaker(
          operationName,
          operation,
          enhancedContext
        );
        return this.createSuccessResult(result, startTime);
      }

      // Execute with retry
      if (this.config.enableRetry) {
        const result = await this.executeWithRetry(
          operationName,
          operation,
          enhancedContext
        );
        return this.createSuccessResult(result, startTime);
      }

      // Execute with error recovery
      if (this.config.enableErrorRecovery) {
        const result = await this.executeWithErrorRecovery(
          operationName,
          operation,
          enhancedContext
        );
        return this.createSuccessResult(result, startTime);
      }

      // Execute with timeout only
      const result = await this.executeWithTimeout(operation, enhancedContext);
      return this.createSuccessResult(result, startTime);

    } catch (error) {
      return this.createErrorResult(error as Error, startTime);
    } finally {
      // Clean up bulkhead
      if (this.config.enableBulkhead) {
        this.releaseBulkhead(operationName);
      }
    }
  }

  private async executeWithCircuitBreaker<T>(
    operationName: string,
    operation: MiddlewareHandler<T>,
    context: MiddlewareContext
  ): Promise<T> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(operationName);
    
    return circuitBreaker.executeWithFallback(
      () => this.executeWithTimeout(operation, context),
      async (error) => {
        // Try error recovery as fallback
        if (this.config.enableErrorRecovery) {
          return this.executeWithErrorRecovery(operationName, operation, context);
        }
        throw error;
      }
    );
  }

  private async executeWithRetry<T>(
    operationName: string,
    operation: MiddlewareHandler<T>,
    context: MiddlewareContext
  ): Promise<T> {
    const retryManager = this.getOrCreateRetryManager(operationName);
    
    const result = await retryManager.execute(() => 
      this.executeWithTimeout(operation, context)
    );
    
    return result.result;
  }

  private async executeWithErrorRecovery<T>(
    operationName: string,
    operation: MiddlewareHandler<T>,
    context: MiddlewareContext
  ): Promise<T> {
    const recoveryManager = this.getOrCreateRecoveryManager(operationName);
    
    const result = await recoveryManager.executeWithRecovery(
      () => this.executeWithTimeout(operation, context),
      operationName
    );
    
    if (result.success) {
      return result.result!;
    } else {
      throw new Error(`All recovery strategies failed for ${operationName}`);
    }
  }

  private async executeWithTimeout<T>(
    operation: MiddlewareHandler<T>,
    context: MiddlewareContext
  ): Promise<T> {
    return Promise.race([
      operation(context),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${this.config.timeoutMs}ms`)),
          this.config.timeoutMs
        )
      )
    ]);
  }

  private async applyRateLimit(operationName: string, request: NextApiRequest): Promise<void> {
    const rateLimiter = this.getOrCreateRateLimiter(operationName);
    
    const clientId = this.getClientId(request);
    
    if (!rateLimiter.isAllowed(clientId)) {
      throw new RateLimitExceededError(
        `Rate limit exceeded for operation ${operationName}`,
        rateLimiter.getWindowInfo(clientId)
      );
    }
    
    rateLimiter.recordRequest(clientId);
  }

  private async applyBulkhead(operationName: string): Promise<void> {
    const bulkhead = this.getOrCreateBulkhead(operationName);
    await bulkhead.acquire();
  }

  private releaseBulkhead(operationName: string): void {
    const bulkhead = this.bulkheads.get(operationName);
    if (bulkhead) {
      bulkhead.release();
    }
  }

  private getClientId(request: NextApiRequest): string {
    // Use IP address as client identifier
    const forwarded = request.headers['x-forwarded-for'];
    const ip = forwarded ? (forwarded as string).split(',')[0] : request.connection.remoteAddress;
    return ip || 'unknown';
  }

  // Factory methods for resilience components
  private getOrCreateCircuitBreaker(operationName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationName)) {
      const circuitBreaker = CircuitBreakerFactory.createApiCircuitBreaker(operationName);
      this.circuitBreakers.set(operationName, circuitBreaker);
    }
    return this.circuitBreakers.get(operationName)!;
  }

  private getOrCreateRetryManager(operationName: string): RetryManager {
    if (!this.retryManagers.has(operationName)) {
      const retryManager = RetryFactory.createApiRetry(this.config.retryConfig);
      this.retryManagers.set(operationName, retryManager);
    }
    return this.retryManagers.get(operationName)!;
  }

  private getOrCreateRecoveryManager(operationName: string): ErrorRecoveryManager {
    if (!this.recoveryManagers.has(operationName)) {
      const recoveryManager = RecoveryStrategyFactory.createWebServiceRecovery(this.config.recoveryConfig);
      this.recoveryManagers.set(operationName, recoveryManager);
    }
    return this.recoveryManagers.get(operationName)!;
  }

  private getOrCreateRateLimiter(operationName: string): RateLimiter {
    if (!this.rateLimiters.has(operationName)) {
      const rateLimiter = new RateLimiter(
        this.config.rateLimitMaxRequests,
        this.config.rateLimitWindow
      );
      this.rateLimiters.set(operationName, rateLimiter);
    }
    return this.rateLimiters.get(operationName)!;
  }

  private getOrCreateBulkhead(operationName: string): BulkheadIsolation {
    if (!this.bulkheads.has(operationName)) {
      const bulkhead = new BulkheadIsolation(this.config.bulkheadMaxConcurrent);
      this.bulkheads.set(operationName, bulkhead);
    }
    return this.bulkheads.get(operationName)!;
  }

  private createSuccessResult<T>(result: T, startTime: number): MiddlewareResult<T> {
    return {
      success: true,
      result,
      metadata: {
        duration: Date.now() - startTime,
        attempts: 1,
        fromCache: false,
        rateLimited: false,
        bulkheadQueued: false
      }
    };
  }

  private createErrorResult(error: Error, startTime: number): MiddlewareResult<any> {
    return {
      success: false,
      error,
      metadata: {
        duration: Date.now() - startTime,
        attempts: 1,
        fromCache: false,
        rateLimited: error instanceof RateLimitExceededError,
        bulkheadQueued: false
      }
    };
  }

  // Monitoring and metrics
  getOperationMetrics(operationName?: string) {
    const metrics: any = {};

    if (operationName) {
      // Get metrics for specific operation
      const circuitBreaker = this.circuitBreakers.get(operationName);
      const rateLimiter = this.rateLimiters.get(operationName);
      const bulkhead = this.bulkheads.get(operationName);

      metrics[operationName] = {
        circuitBreaker: circuitBreaker?.getMetrics(),
        rateLimiter: rateLimiter?.getMetrics(),
        bulkhead: bulkhead?.getMetrics()
      };
    } else {
      // Get metrics for all operations
      this.circuitBreakers.forEach((cb, name) => {
        metrics[name] = metrics[name] || {};
        metrics[name].circuitBreaker = cb.getMetrics();
      });

      this.rateLimiters.forEach((rl, name) => {
        metrics[name] = metrics[name] || {};
        metrics[name].rateLimiter = rl.getMetrics();
      });

      this.bulkheads.forEach((bh, name) => {
        metrics[name] = metrics[name] || {};
        metrics[name].bulkhead = bh.getMetrics();
      });
    }

    return metrics;
  }

  reset(): void {
    this.circuitBreakers.clear();
    this.retryManagers.clear();
    this.recoveryManagers.clear();
    this.rateLimiters.clear();
    this.bulkheads.clear();
    this.activeOperations.clear();
  }
}

// Rate Limiter implementation
class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    
    // Remove expired requests
    const validRequests = clientRequests.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    this.requests.set(clientId, validRequests);
    
    return validRequests.length < this.maxRequests;
  }

  recordRequest(clientId: string): void {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    clientRequests.push(now);
    this.requests.set(clientId, clientRequests);
  }

  getWindowInfo(clientId: string) {
    const clientRequests = this.requests.get(clientId) || [];
    const now = Date.now();
    const validRequests = clientRequests.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    return {
      currentRequests: validRequests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      resetTime: Math.min(...validRequests) + this.windowMs
    };
  }

  getMetrics() {
    const totalClients = this.requests.size;
    const totalRequests = Array.from(this.requests.values())
      .reduce((sum, requests) => sum + requests.length, 0);
    
    return {
      totalClients,
      totalRequests,
      averageRequestsPerClient: totalClients > 0 ? totalRequests / totalClients : 0
    };
  }
}

// Bulkhead Isolation implementation
class BulkheadIsolation {
  private activeCount = 0;
  private queue: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return Promise.resolve();
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  release(): void {
    this.activeCount--;
    
    // Process queue
    if (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const { resolve } = this.queue.shift()!;
      this.activeCount++;
      resolve();
    }
  }

  getMetrics() {
    return {
      activeCount: this.activeCount,
      queueLength: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      utilization: (this.activeCount / this.maxConcurrent) * 100
    };
  }
}

// Custom errors
export class RateLimitExceededError extends Error {
  constructor(message: string, public readonly windowInfo: any) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export class BulkheadCapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkheadCapacityError';
  }
}

// Next.js API middleware wrapper
export function withFaultTolerance(
  config?: Partial<FaultToleranceConfig>
) {
  const middleware = new FaultToleranceMiddleware(config);

  return function <T = any>(
    operationName: string,
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<T>
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const context: MiddlewareContext = {
        request: req,
        response: res,
        startTime: Date.now(),
        operationId: '',
        metadata: {}
      };

      try {
        const result = await middleware.executeWithFaultTolerance(
          operationName,
          async (ctx) => handler(ctx.request, ctx.response),
          context
        );

        if (result.success) {
          return result.result;
        } else {
          throw result.error;
        }
      } catch (error) {
        // Handle rate limiting specifically
        if (error instanceof RateLimitExceededError) {
          res.status(429).json({
            error: 'Rate limit exceeded',
            details: error.windowInfo
          });
          return;
        }

        // Let other errors propagate
        throw error;
      }
    };
  };
}

// React context for fault tolerance
const FaultToleranceContext = React.createContext<FaultToleranceMiddleware | null>(null);

export function FaultToleranceProvider({ 
  children, 
  config 
}: { 
  children: React.ReactNode; 
  config?: Partial<FaultToleranceConfig> 
}) {
  const middleware = React.useMemo(() => new FaultToleranceMiddleware(config), [config]);

  return React.createElement(
    FaultToleranceContext.Provider,
    { value: middleware },
    children
  );
}

export function useFaultTolerance() {
  const middleware = React.useContext(FaultToleranceContext);
  
  if (!middleware) {
    throw new Error('useFaultTolerance must be used within a FaultToleranceProvider');
  }

  return {
    executeWithFaultTolerance: middleware.executeWithFaultTolerance.bind(middleware),
    getMetrics: middleware.getOperationMetrics.bind(middleware)
  };
}

import React from 'react';