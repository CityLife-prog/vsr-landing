/**
 * Circuit Breaker Pattern - Resilience Layer
 * Prevents cascading failures by temporarily disabling failing services
 */

export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Service is failing, requests are blocked
  HALF_OPEN = 'half_open' // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold?: number;      // Number of successes needed to close circuit
  timeout: number;               // Time in ms to wait before half-open attempt
  monitoringPeriod?: number;      // Time window for failure counting
  volumeThreshold?: number;       // Minimum requests before circuit can open
  errorFilter?: (error: Error) => boolean; // Filter which errors count as failures
  onStateChange?: (state: CircuitBreakerState, metrics: CircuitBreakerMetrics) => void;
  name?: string;                 // Circuit breaker identifier
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: CircuitBreakerState;
  uptime: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface CircuitBreakerRequest {
  id: string;
  timestamp: number;
  success: boolean;
  responseTime: number;
  error?: Error;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private metrics: CircuitBreakerMetrics;
  private requests: CircuitBreakerRequest[] = [];
  private lastOpenTime = 0;
  private readonly config: Required<CircuitBreakerConfig>;
  private stateChangeListeners: Array<(state: CircuitBreakerState, metrics: CircuitBreakerMetrics) => void> = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      volumeThreshold: 10,
      errorFilter: () => true,
      onStateChange: () => {},
      name: 'default',
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      state: this.state,
      uptime: Date.now(),
      errorRate: 0,
      averageResponseTime: 0
    };

    // Set up periodic cleanup
    setInterval(() => this.cleanupOldRequests(), this.config.monitoringPeriod / 4);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Check if circuit allows request
    if (!this.canExecute()) {
      const error = new CircuitBreakerOpenError(
        `Circuit breaker [${this.config.name}] is OPEN. Service unavailable.`,
        this.state,
        this.metrics
      );
      this.recordRequest(requestId, startTime, false, error);
      throw error;
    }

    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      this.recordRequest(requestId, startTime, true, undefined, responseTime);
      this.onSuccess();
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordRequest(requestId, startTime, false, error as Error, responseTime);
      this.onFailure(error as Error);
      throw error;
    }
  }

  // Execute with fallback
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: (error: Error) => Promise<T> | T
  ): Promise<T> {
    try {
      return await this.execute(operation);
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return await fallback(error);
      }
      throw error;
    }
  }

  // Check if request can be executed
  private canExecute(): boolean {
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;
      
      case CircuitBreakerState.OPEN:
        // Check if timeout has passed
        if (Date.now() - this.lastOpenTime >= this.config.timeout) {
          this.setState(CircuitBreakerState.HALF_OPEN);
          return true;
        }
        return false;
      
      case CircuitBreakerState.HALF_OPEN:
        // Allow limited requests to test service
        const recentRequests = this.getRecentRequests();
        const testRequests = recentRequests.filter(r => r.timestamp >= this.lastOpenTime);
        return testRequests.length < this.config.successThreshold;
      
      default:
        return false;
    }
  }

  private onSuccess(): void {
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
        this.setState(CircuitBreakerState.CLOSED);
      }
    }

    this.updateMetrics();
  }

  private onFailure(error: Error): void {
    // Check if error should count as failure
    if (!this.config.errorFilter(error)) {
      return;
    }

    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();

    // Check if circuit should open
    const recentRequests = this.getRecentRequests();
    const recentFailures = recentRequests.filter(r => !r.success).length;

    const shouldOpen = 
      this.state === CircuitBreakerState.CLOSED &&
      recentRequests.length >= this.config.volumeThreshold &&
      recentFailures >= this.config.failureThreshold;

    const shouldOpenFromHalfOpen = 
      this.state === CircuitBreakerState.HALF_OPEN;

    if (shouldOpen || shouldOpenFromHalfOpen) {
      this.setState(CircuitBreakerState.OPEN);
      this.lastOpenTime = Date.now();
    }

    this.updateMetrics();
  }

  private setState(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.metrics.state = newState;

      console.log(`Circuit Breaker [${this.config.name}] state changed: ${oldState} → ${newState}`);

      // Notify listeners
      this.config.onStateChange(newState, this.metrics);
      this.stateChangeListeners.forEach(listener => {
        try {
          listener(newState, this.metrics);
        } catch (error) {
          console.error('Error in circuit breaker state change listener:', error);
        }
      });
    }
  }

  private recordRequest(
    id: string,
    timestamp: number,
    success: boolean,
    error?: Error,
    responseTime?: number
  ): void {
    const request: CircuitBreakerRequest = {
      id,
      timestamp,
      success,
      responseTime: responseTime || 0,
      error
    };

    this.requests.push(request);
    this.updateMetrics();
  }

  private updateMetrics(): void {
    const recentRequests = this.getRecentRequests();
    
    this.metrics.totalRequests = recentRequests.length;
    this.metrics.successfulRequests = recentRequests.filter(r => r.success).length;
    this.metrics.failedRequests = recentRequests.filter(r => !r.success).length;
    this.metrics.errorRate = this.metrics.totalRequests > 0 
      ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100 
      : 0;
    
    const responseTimes = recentRequests.map(r => r.responseTime).filter(rt => rt > 0);
    this.metrics.averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0;
  }

  private getRecentRequests(): CircuitBreakerRequest[] {
    const cutoff = Date.now() - this.config.monitoringPeriod;
    return this.requests.filter(r => r.timestamp >= cutoff);
  }

  private cleanupOldRequests(): void {
    const cutoff = Date.now() - this.config.monitoringPeriod;
    this.requests = this.requests.filter(r => r.timestamp >= cutoff);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API
  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }

  // Manual control (use with caution)
  forceOpen(): void {
    this.setState(CircuitBreakerState.OPEN);
    this.lastOpenTime = Date.now();
  }

  forceClose(): void {
    this.setState(CircuitBreakerState.CLOSED);
    this.metrics.consecutiveFailures = 0;
    this.metrics.consecutiveSuccesses = 0;
  }

  reset(): void {
    this.setState(CircuitBreakerState.CLOSED);
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      state: CircuitBreakerState.CLOSED,
      uptime: Date.now(),
      errorRate: 0,
      averageResponseTime: 0
    };
    this.requests = [];
  }

  onStateChange(listener: (state: CircuitBreakerState, metrics: CircuitBreakerMetrics) => void): void {
    this.stateChangeListeners.push(listener);
  }

  removeStateChangeListener(listener: (state: CircuitBreakerState, metrics: CircuitBreakerMetrics) => void): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }
}

// Circuit breaker specific errors
export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitBreakerState,
    public readonly metrics: CircuitBreakerMetrics
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// Circuit breaker factory for creating configured instances
export class CircuitBreakerFactory {
  private static instances = new Map<string, CircuitBreaker>();

  static create(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (this.instances.has(name)) {
      return this.instances.get(name)!;
    }

    const circuitBreaker = new CircuitBreaker({ ...config, name });
    this.instances.set(name, circuitBreaker);
    return circuitBreaker;
  }

  static get(name: string): CircuitBreaker | undefined {
    return this.instances.get(name);
  }

  static getAll(): Map<string, CircuitBreaker> {
    return new Map(this.instances);
  }

  static remove(name: string): boolean {
    return this.instances.delete(name);
  }

  static reset(): void {
    this.instances.forEach(cb => cb.reset());
    this.instances.clear();
  }

  // Predefined configurations for common use cases
  static createDatabaseCircuitBreaker(name: string = 'database'): CircuitBreaker {
    return this.create(name, {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 10000, // 10 seconds
      monitoringPeriod: 60000, // 1 minute
      volumeThreshold: 5,
      errorFilter: (error) => {
        // Don't count validation errors as circuit breaker failures
        return !error.message.includes('validation') && 
               !error.message.includes('constraint');
      }
    });
  }

  static createApiCircuitBreaker(name: string = 'api'): CircuitBreaker {
    return this.create(name, {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000, // 30 seconds
      monitoringPeriod: 120000, // 2 minutes
      volumeThreshold: 10,
      errorFilter: (error) => {
        // Don't count 4xx client errors as circuit breaker failures
        return !error.message.includes('400') && 
               !error.message.includes('401') && 
               !error.message.includes('403') && 
               !error.message.includes('404');
      }
    });
  }

  static createExternalServiceCircuitBreaker(name: string): CircuitBreaker {
    return this.create(name, {
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      volumeThreshold: 20,
      errorFilter: () => true // Count all errors
    });
  }
}

// Decorator for circuit breaker functionality
export function CircuitBreakered(config: CircuitBreakerConfig) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      private circuitBreaker: CircuitBreaker;

      constructor(...args: any[]) {
        super(...args);
        this.circuitBreaker = new CircuitBreaker(config);
      }

      async executeWithCircuitBreaker<R>(operation: () => Promise<R>): Promise<R> {
        return this.circuitBreaker.execute(operation);
      }
    };
  };
}

// Hook for React components
export function useCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
  const [circuitBreaker] = React.useState(() => {
    return config 
      ? CircuitBreakerFactory.create(name, config)
      : CircuitBreakerFactory.get(name) || CircuitBreakerFactory.createApiCircuitBreaker(name);
  });

  React.useEffect(() => {
    return () => {
      // Cleanup if component unmounts
      // CircuitBreakerFactory.remove(name);
    };
  }, [name]);

  return circuitBreaker;
}

import React from 'react';