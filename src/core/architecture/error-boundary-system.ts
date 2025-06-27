/**
 * Enterprise Error Boundary and Recovery System
 * ENTERPRISE PATTERN: Circuit Breaker + Bulkhead + Retry + Fallback
 * 
 * Features:
 * - Circuit breaker pattern for external services
 * - Bulkhead isolation for different components
 * - Exponential backoff retry mechanisms
 * - Graceful degradation and fallback strategies
 * - Error correlation and root cause analysis
 */

// ================== ERROR CLASSIFICATION ==================

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  BUSINESS_LOGIC = 'business_logic',
  VALIDATION = 'validation',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  INTEGRATION = 'integration'
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  operation: string;
  component: string;
  timestamp: Date;
  correlationId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export class EnterpriseError extends Error {
  public readonly id: string;
  public readonly correlationId: string;
  public readonly timestamp: Date;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context: ErrorContext;
  public readonly innerError?: Error;
  public readonly retryable: boolean;
  
  constructor(
    message: string,
    context: ErrorContext,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      innerError?: Error;
      retryable?: boolean;
      code?: string;
    } = {}
  ) {
    super(message);
    
    this.name = 'EnterpriseError';
    this.id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.correlationId = context.correlationId;
    this.timestamp = new Date();
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.category = options.category || ErrorCategory.BUSINESS_LOGIC;
    this.context = { ...context, timestamp: this.timestamp };
    this.innerError = options.innerError;
    this.retryable = options.retryable || false;
    
    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnterpriseError);
    }
  }
  
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      severity: this.severity,
      category: this.category,
      context: this.context,
      retryable: this.retryable,
      stack: this.stack,
      innerError: this.innerError ? {
        name: this.innerError.name,
        message: this.innerError.message,
        stack: this.innerError.stack
      } : undefined
    };
  }
}

// ================== CIRCUIT BREAKER PATTERN ==================

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  minimumThroughput: number;
  errorPercentageThreshold: number;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  lastFailureTime?: Date;
  stateChangedAt: Date;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private metrics: CircuitBreakerMetrics;
  private readonly failures: Date[] = [];
  private lastStateChange: Date = new Date();
  
  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig,
    private readonly logger: any
  ) {
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successfulRequests: 0,
      stateChangedAt: new Date()
    };
  }
  
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.logStateChange();
      } else {
        this.logger.warn('Circuit breaker is OPEN, executing fallback', {
          circuitBreaker: this.name,
          state: this.state
        });
        
        if (fallback) {
          return await fallback();
        }
        
        throw new EnterpriseError(
          `Circuit breaker ${this.name} is OPEN`,
          {
            operation: 'circuit_breaker_check',
            component: this.name,
            correlationId: this.generateCorrelationId(),
            timestamp: new Date()
          },
          {
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.INFRASTRUCTURE,
            retryable: false
          }
        );
      }
    }
    
    try {
      this.metrics.totalRequests++;
      const result = await operation();
      this.onSuccess();
      return result;
      
    } catch (error) {
      this.onFailure(error);
      
      if (fallback) {
        this.logger.info('Executing fallback after circuit breaker opened', {
          circuitBreaker: this.name,
          error: error instanceof Error ? error.message : String(error)
        });
        return await fallback();
      }
      
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.metrics.successfulRequests++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failures.length = 0;
      this.logStateChange();
    }
  }
  
  private onFailure(error: any): void {
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = new Date();
    this.failures.push(new Date());
    
    // Clean old failures outside monitoring period
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    while (this.failures.length > 0 && this.failures[0] < cutoff) {
      this.failures.shift();
    }
    
    if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
      this.logStateChange();
    }
    
    this.logger.error('Circuit breaker recorded failure', error instanceof Error ? error : new Error(String(error)), {
      circuitBreaker: this.name,
      state: this.state,
      failureCount: this.failures.length,
      metrics: this.metrics
    });
  }
  
  private shouldOpenCircuit(): boolean {
    if (this.state === CircuitState.OPEN) {
      return false;
    }
    
    // Check minimum throughput
    if (this.metrics.totalRequests < this.config.minimumThroughput) {
      return false;
    }
    
    // Check failure threshold
    if (this.failures.length >= this.config.failureThreshold) {
      return true;
    }
    
    // Check error percentage
    const errorPercentage = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
    return errorPercentage >= this.config.errorPercentageThreshold;
  }
  
  private shouldAttemptReset(): boolean {
    const timeSinceOpen = Date.now() - this.lastStateChange.getTime();
    return timeSinceOpen >= this.config.recoveryTimeout;
  }
  
  private logStateChange(): void {
    this.lastStateChange = new Date();
    this.metrics.stateChangedAt = this.lastStateChange;
    
    this.logger.info('Circuit breaker state changed', {
      circuitBreaker: this.name,
      newState: this.state,
      metrics: this.metrics
    });
  }
  
  private generateCorrelationId(): string {
    return `cb_${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }
  
  getState(): CircuitState {
    return this.state;
  }
}

// ================== RETRY MECHANISM WITH EXPONENTIAL BACKOFF ==================

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableErrors: string[];
}

export interface RetryMetrics {
  attemptNumber: number;
  totalDelay: number;
  errors: Error[];
}

export class RetryHandler {
  constructor(
    private readonly config: RetryConfig,
    private readonly logger: any
  ) {}
  
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    correlationId: string
  ): Promise<T> {
    const metrics: RetryMetrics = {
      attemptNumber: 0,
      totalDelay: 0,
      errors: []
    };
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      metrics.attemptNumber = attempt;
      
      try {
        if (attempt > 1) {
          this.logger.info('Retrying operation', {
            operation: operationName,
            attempt,
            correlationId,
            totalDelay: metrics.totalDelay
          });
        }
        
        return await operation();
        
      } catch (error) {
        metrics.errors.push(error instanceof Error ? error : new Error(String(error)));
        
        if (attempt === this.config.maxAttempts) {
          this.logger.error('All retry attempts exhausted', error as Error, {
            operation: operationName,
            correlationId,
            metrics
          });
          
          throw new EnterpriseError(
            `Operation ${operationName} failed after ${this.config.maxAttempts} attempts`,
            {
              operation: operationName,
              component: 'retry_handler',
              correlationId,
              timestamp: new Date()
            },
            {
              severity: ErrorSeverity.HIGH,
              category: ErrorCategory.INFRASTRUCTURE,
              innerError: error instanceof Error ? error : new Error(String(error)),
              retryable: false
            }
          );
        }
        
        if (!this.isRetryableError(error)) {
          this.logger.warn('Non-retryable error encountered', {
            operation: operationName,
            attempt,
            correlationId,
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        metrics.totalDelay += delay;
        
        this.logger.warn('Operation failed, retrying after delay', {
          operation: operationName,
          attempt,
          correlationId,
          delay,
          error: error instanceof Error ? error.message : String(error)
        });
        
        await this.sleep(delay);
      }
    }
    
    // This should never be reached due to the throw in the loop
    throw new Error('Unexpected end of retry loop');
  }
  
  private isRetryableError(error: any): boolean {
    if (error instanceof EnterpriseError) {
      return error.retryable;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return this.config.retryableErrors.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
    const jitter = Math.random() * this.config.jitterMs;
    
    return Math.floor(cappedDelay + jitter);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ================== BULKHEAD ISOLATION PATTERN ==================

export interface BulkheadConfig {
  maxConcurrentExecutions: number;
  queueCapacity: number;
  timeoutMs: number;
}

export interface BulkheadMetrics {
  activeExecutions: number;
  queuedRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  timeoutRequests: number;
}

export class Bulkhead {
  private activeExecutions = 0;
  private readonly queue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    enqueuedAt: Date;
  }> = [];
  
  private readonly metrics: BulkheadMetrics = {
    activeExecutions: 0,
    queuedRequests: 0,
    completedRequests: 0,
    rejectedRequests: 0,
    timeoutRequests: 0
  };
  
  constructor(
    private readonly name: string,
    private readonly config: BulkheadConfig,
    private readonly logger: any
  ) {}
  
  async execute<T>(operation: () => Promise<T>, correlationId: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Check if we can execute immediately
      if (this.activeExecutions < this.config.maxConcurrentExecutions) {
        this.executeOperation(operation, resolve, reject, correlationId);
        return;
      }
      
      // Check if queue has capacity
      if (this.queue.length >= this.config.queueCapacity) {
        this.metrics.rejectedRequests++;
        
        const error = new EnterpriseError(
          `Bulkhead ${this.name} queue is full`,
          {
            operation: 'bulkhead_queue_check',
            component: this.name,
            correlationId,
            timestamp: new Date()
          },
          {
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.PERFORMANCE,
            retryable: true
          }
        );
        
        this.logger.error('Bulkhead queue is full, rejecting request', error, {
          bulkhead: this.name,
          metrics: this.metrics
        });
        
        reject(error);
        return;
      }
      
      // Add to queue
      this.queue.push({
        operation,
        resolve,
        reject,
        enqueuedAt: new Date()
      });
      
      this.metrics.queuedRequests++;
      
      this.logger.debug('Request queued in bulkhead', {
        bulkhead: this.name,
        correlationId,
        queuePosition: this.queue.length,
        metrics: this.metrics
      });
    });
  }
  
  private async executeOperation<T>(
    operation: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (error: any) => void,
    correlationId: string
  ): Promise<void> {
    this.activeExecutions++;
    this.metrics.activeExecutions = this.activeExecutions;
    
    const timeoutPromise = new Promise<never>((_, timeoutReject) => {
      setTimeout(() => {
        this.metrics.timeoutRequests++;
        
        const error = new EnterpriseError(
          `Operation timed out in bulkhead ${this.name}`,
          {
            operation: 'bulkhead_timeout',
            component: this.name,
            correlationId,
            timestamp: new Date()
          },
          {
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.PERFORMANCE,
            retryable: true
          }
        );
        
        timeoutReject(error);
      }, this.config.timeoutMs);
    });
    
    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      this.metrics.completedRequests++;
      resolve(result);
      
    } catch (error) {
      this.logger.error('Operation failed in bulkhead', error as Error, {
        bulkhead: this.name,
        correlationId
      });
      reject(error);
      
    } finally {
      this.activeExecutions--;
      this.metrics.activeExecutions = this.activeExecutions;
      
      // Process next item in queue
      this.processQueue();
    }
  }
  
  private processQueue(): void {
    if (this.queue.length === 0 || this.activeExecutions >= this.config.maxConcurrentExecutions) {
      return;
    }
    
    const queuedItem = this.queue.shift();
    if (!queuedItem) {
      return;
    }
    
    this.metrics.queuedRequests--;
    
    // Check if request has been waiting too long
    const waitTime = Date.now() - queuedItem.enqueuedAt.getTime();
    if (waitTime > this.config.timeoutMs) {
      this.metrics.timeoutRequests++;
      
      const error = new EnterpriseError(
        `Request timed out while queued in bulkhead ${this.name}`,
        {
          operation: 'bulkhead_queue_timeout',
          component: this.name,
          correlationId: 'unknown',
          timestamp: new Date()
        },
        {
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.PERFORMANCE,
          retryable: true
        }
      );
      
      queuedItem.reject(error);
      this.processQueue(); // Try next item
      return;
    }
    
    this.executeOperation(
      queuedItem.operation,
      queuedItem.resolve,
      queuedItem.reject,
      'queued_operation'
    );
  }
  
  getMetrics(): BulkheadMetrics {
    return { ...this.metrics };
  }
}

// ================== COMPOSITE ERROR BOUNDARY ==================

export interface ErrorBoundaryConfig {
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
  bulkhead: BulkheadConfig;
  enableFallback: boolean;
  correlationIdGenerator?: () => string;
}

export class ErrorBoundary {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryHandler: RetryHandler;
  private readonly bulkhead: Bulkhead;
  
  constructor(
    private readonly name: string,
    private readonly config: ErrorBoundaryConfig,
    private readonly logger: any
  ) {
    this.circuitBreaker = new CircuitBreaker(
      `${name}_circuit`,
      config.circuitBreaker,
      logger
    );
    
    this.retryHandler = new RetryHandler(config.retry, logger);
    this.bulkhead = new Bulkhead(`${name}_bulkhead`, config.bulkhead, logger);
  }
  
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const correlationId = this.config.correlationIdGenerator?.() || 
      `eb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info('Error boundary executing operation', {
      errorBoundary: this.name,
      operation: operationName,
      correlationId
    });
    
    try {
      // Wrap operation with bulkhead isolation
      const bulkheadOperation = () => this.bulkhead.execute(operation, correlationId);
      
      // Wrap with retry mechanism
      const retryOperation = () => this.retryHandler.execute(
        bulkheadOperation,
        operationName,
        correlationId
      );
      
      // Wrap with circuit breaker
      return await this.circuitBreaker.execute(retryOperation, fallback);
      
    } catch (error) {
      this.logger.error('Error boundary operation failed', error as Error, {
        errorBoundary: this.name,
        operation: operationName,
        correlationId,
        circuitBreakerState: this.circuitBreaker.getState(),
        bulkheadMetrics: this.bulkhead.getMetrics()
      });
      
      throw error;
    }
  }
  
  getHealthStatus(): {
    name: string;
    healthy: boolean;
    circuitBreakerState: CircuitState;
    bulkheadMetrics: BulkheadMetrics;
    circuitBreakerMetrics: CircuitBreakerMetrics;
  } {
    const cbState = this.circuitBreaker.getState();
    const bulkheadMetrics = this.bulkhead.getMetrics();
    
    return {
      name: this.name,
      healthy: cbState === CircuitState.CLOSED && bulkheadMetrics.rejectedRequests === 0,
      circuitBreakerState: cbState,
      bulkheadMetrics,
      circuitBreakerMetrics: this.circuitBreaker.getMetrics()
    };
  }
}