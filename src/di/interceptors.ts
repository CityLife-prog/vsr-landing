/**
 * Service Interceptors and Middleware
 * AOP (Aspect-Oriented Programming) support for the DI container
 */

import { ServiceInterceptor, ServiceToken, Container } from './types';

// Base interceptor interface implementation
export abstract class InterceptorBase implements ServiceInterceptor {
  abstract intercept(target: any, method: string, args: any[], proceed: () => any): any;
  
  protected async executeAsync(fn: () => any): Promise<any> {
    const result = fn();
    return result instanceof Promise ? await result : result;
  }
}

// Logging interceptor
export class LoggingInterceptor extends InterceptorBase {
  constructor(private logger?: any) {
    super();
    this.logger = logger || console;
  }

  intercept(target: any, method: string, args: any[], proceed: () => any): any {
    const className = target.constructor.name;
    const startTime = Date.now();
    
    this.logger.debug(`[${className}] Calling ${method} with args:`, args);
    
    try {
      const result = proceed();
      
      if (result instanceof Promise) {
        return result
          .then((value) => {
            const duration = Date.now() - startTime;
            this.logger.debug(`[${className}] ${method} completed in ${duration}ms with result:`, value);
            return value;
          })
          .catch((error) => {
            const duration = Date.now() - startTime;
            this.logger.error(`[${className}] ${method} failed in ${duration}ms:`, error);
            throw error;
          });
      } else {
        const duration = Date.now() - startTime;
        this.logger.debug(`[${className}] ${method} completed in ${duration}ms with result:`, result);
        return result;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${className}] ${method} failed in ${duration}ms:`, error);
      throw error;
    }
  }
}

// Performance monitoring interceptor
export class PerformanceInterceptor extends InterceptorBase {
  private metrics = new Map<string, MethodMetrics>();

  constructor(private performanceMonitor?: any) {
    super();
  }

  intercept(target: any, method: string, args: any[], proceed: () => any): any {
    const className = target.constructor.name;
    const methodKey = `${className}.${method}`;
    const startTime = Date.now();
    
    try {
      const result = proceed();
      
      if (result instanceof Promise) {
        return result
          .then((value) => {
            this.recordMetrics(methodKey, Date.now() - startTime, true);
            return value;
          })
          .catch((error) => {
            this.recordMetrics(methodKey, Date.now() - startTime, false);
            throw error;
          });
      } else {
        this.recordMetrics(methodKey, Date.now() - startTime, true);
        return result;
      }
    } catch (error) {
      this.recordMetrics(methodKey, Date.now() - startTime, false);
      throw error;
    }
  }

  private recordMetrics(methodKey: string, duration: number, success: boolean): void {
    let metrics = this.metrics.get(methodKey);
    if (!metrics) {
      metrics = {
        calls: 0,
        totalDuration: 0,
        successes: 0,
        failures: 0,
        minDuration: Infinity,
        maxDuration: 0
      };
      this.metrics.set(methodKey, metrics);
    }

    metrics.calls++;
    metrics.totalDuration += duration;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    
    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }

    // Report to performance monitor if available
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(methodKey, duration, success);
    }
  }

  getMetrics(): Map<string, MethodMetrics> {
    return new Map(this.metrics);
  }

  resetMetrics(): void {
    this.metrics.clear();
  }
}

interface MethodMetrics {
  calls: number;
  totalDuration: number;
  successes: number;
  failures: number;
  minDuration: number;
  maxDuration: number;
}

// Caching interceptor
export class CachingInterceptor extends InterceptorBase {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private options: CachingOptions = {}
  ) {
    super();
    this.options = {
      ttl: 300000, // 5 minutes default
      maxSize: 1000,
      keyGenerator: this.defaultKeyGenerator.bind(this),
      ...options
    };
  }

  intercept(target: any, method: string, args: any[], proceed: () => any): any {
    const cacheKey = this.options.keyGenerator!(target, method, args);
    const cached = this.get(cacheKey);
    
    if (cached !== undefined) {
      return cached;
    }

    const result = proceed();
    
    if (result instanceof Promise) {
      return result.then((value) => {
        this.set(cacheKey, value);
        return value;
      });
    } else {
      this.set(cacheKey, result);
      return result;
    }
  }

  private defaultKeyGenerator(target: any, method: string, args: any[]): string {
    const className = target.constructor.name;
    const argsKey = JSON.stringify(args);
    return `${className}.${method}(${argsKey})`;
  }

  private get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  private set(key: string, value: any): void {
    // Clean up if cache is too large
    if (this.cache.size >= this.options.maxSize!) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    const expiry = Date.now() + this.options.ttl!;
    this.cache.set(key, { value, expiry });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

interface CacheEntry {
  value: any;
  expiry: number;
}

interface CachingOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  keyGenerator?: (target: any, method: string, args: any[]) => string;
}

// Retry interceptor
export class RetryInterceptor extends InterceptorBase {
  constructor(
    private options: RetryOptions = {}
  ) {
    super();
    this.options = {
      maxAttempts: 3,
      delay: 1000,
      exponentialBackoff: true,
      shouldRetry: this.defaultShouldRetry.bind(this),
      ...options
    };
  }

  intercept(target: any, method: string, args: any[], proceed: () => any): any {
    return this.executeWithRetry(proceed, 0);
  }

  private async executeWithRetry(proceed: () => any, attempt: number): Promise<any> {
    try {
      const result = proceed();
      return result instanceof Promise ? await result : result;
    } catch (error) {
      if (attempt >= this.options.maxAttempts! - 1 || !this.options.shouldRetry!(error, attempt)) {
        throw error;
      }

      const delay = this.options.exponentialBackoff 
        ? this.options.delay! * Math.pow(2, attempt)
        : this.options.delay!;

      await this.sleep(delay);
      return this.executeWithRetry(proceed, attempt + 1);
    }
  }

  private defaultShouldRetry(error: any, attempt: number): boolean {
    // Retry on network errors, timeouts, and 5xx HTTP errors
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND' ||
           (error.response && error.response.status >= 500);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RetryOptions {
  maxAttempts?: number;
  delay?: number; // Initial delay in milliseconds
  exponentialBackoff?: boolean;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

// Circuit breaker interceptor
export class CircuitBreakerInterceptor extends InterceptorBase {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;

  constructor(
    private options: CircuitBreakerOptions = {}
  ) {
    super();
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      ...options
    };
  }

  intercept(target: any, method: string, args: any[], proceed: () => any): any {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout!) {
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = proceed();
      
      if (result instanceof Promise) {
        return result
          .then((value) => {
            this.onSuccess();
            return value;
          })
          .catch((error) => {
            this.onFailure();
            throw error;
          });
      } else {
        this.onSuccess();
        return result;
      }
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold!) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number; // Time in milliseconds
  monitoringPeriod?: number;
}

interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime: number;
}

// Security interceptor
export class SecurityInterceptor extends InterceptorBase {
  constructor(
    private authorizer: (target: any, method: string, args: any[]) => boolean = () => true
  ) {
    super();
  }

  intercept(target: any, method: string, args: any[], proceed: () => any): any {
    if (!this.authorizer(target, method, args)) {
      throw new Error(`Access denied to ${target.constructor.name}.${method}`);
    }
    
    return proceed();
  }
}

// Validation interceptor
export class ValidationInterceptor extends InterceptorBase {
  constructor(
    private validator: (target: any, method: string, args: any[]) => ValidationResult = () => ({ valid: true })
  ) {
    super();
  }

  intercept(target: any, method: string, args: any[], proceed: () => any): any {
    const validation = this.validator(target, method, args);
    
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.message || 'Invalid arguments'}`);
    }
    
    return proceed();
  }
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

// Interceptor chain builder
export class InterceptorChain {
  private interceptors: ServiceInterceptor[] = [];

  add(interceptor: ServiceInterceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  addLogging(logger?: any): this {
    return this.add(new LoggingInterceptor(logger));
  }

  addPerformance(monitor?: any): this {
    return this.add(new PerformanceInterceptor(monitor));
  }

  addCaching(options?: CachingOptions): this {
    return this.add(new CachingInterceptor(options));
  }

  addRetry(options?: RetryOptions): this {
    return this.add(new RetryInterceptor(options));
  }

  addCircuitBreaker(options?: CircuitBreakerOptions): this {
    return this.add(new CircuitBreakerInterceptor(options));
  }

  addSecurity(authorizer?: (target: any, method: string, args: any[]) => boolean): this {
    return this.add(new SecurityInterceptor(authorizer));
  }

  addValidation(validator?: (target: any, method: string, args: any[]) => ValidationResult): this {
    return this.add(new ValidationInterceptor(validator));
  }

  build(): ServiceInterceptor[] {
    return [...this.interceptors];
  }

  execute(target: any, method: string, args: any[], originalMethod: Function): any {
    let index = 0;
    
    const proceed = (): any => {
      if (index < this.interceptors.length) {
        const interceptor = this.interceptors[index++];
        return interceptor.intercept(target, method, args, proceed);
      } else {
        return originalMethod.apply(target, args);
      }
    };

    return proceed();
  }
}

// Proxy factory for creating intercepted instances
export class InterceptedProxy {
  static create<T extends object>(
    target: T,
    interceptors: ServiceInterceptor[]
  ): T {
    const chain = new InterceptorChain();
    interceptors.forEach(interceptor => chain.add(interceptor));

    return new Proxy(target, {
      get(target: any, prop: string | symbol) {
        const value = target[prop];
        
        if (typeof value === 'function' && typeof prop === 'string') {
          return function (this: any, ...args: any[]) {
            return chain.execute(target, prop, args, value);
          };
        }
        
        return value;
      }
    });
  }
}

// Common interceptor presets
export const interceptorPresets = {
  // Basic monitoring
  basic: () => new InterceptorChain()
    .addLogging()
    .addPerformance()
    .build(),

  // Production ready
  production: () => new InterceptorChain()
    .addPerformance()
    .addCircuitBreaker()
    .addRetry()
    .build(),

  // Development with debugging
  development: () => new InterceptorChain()
    .addLogging()
    .addPerformance()
    .addValidation()
    .build(),

  // High performance with caching
  cached: (options?: CachingOptions) => new InterceptorChain()
    .addCaching(options)
    .addPerformance()
    .build(),

  // Secure services
  secure: (authorizer?: (target: any, method: string, args: any[]) => boolean) => new InterceptorChain()
    .addSecurity(authorizer)
    .addValidation()
    .addLogging()
    .build()
};