/**
 * Resilience Layer - Main Export
 * Comprehensive error handling, circuit breakers, retry logic, and fault tolerance
 */

// Error Boundaries
export * from './ErrorBoundary';

// Circuit Breaker Pattern
export * from './CircuitBreaker';

// Retry Logic
export * from './RetryLogic';

// Database Resilience
export * from './DatabaseResilience';

// Error Recovery
export * from './ErrorRecovery';

// Fault Tolerance Middleware
export * from './FaultToleranceMiddleware';

// Failure Monitoring
export * from './FailureMonitoring';

// Error Reporting
export * from './ErrorReporting';

// Resilience Container for dependency injection
import { CircuitBreakerFactory } from './CircuitBreaker';
import { RetryFactory } from './RetryLogic';
import { DatabaseResilienceFactory } from './DatabaseResilience';
import { RecoveryStrategyFactory } from './ErrorRecovery';
import { FaultToleranceMiddleware } from './FaultToleranceMiddleware';
import { FailureMonitoringService, globalFailureMonitoring } from './FailureMonitoring';
import { ErrorReportingService, globalErrorReporting } from './ErrorReporting';

export class ResilienceContainer {
  private static instance: ResilienceContainer | null = null;
  private readonly services = new Map<string, unknown>();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): ResilienceContainer {
    if (!ResilienceContainer.instance) {
      ResilienceContainer.instance = new ResilienceContainer();
    }
    return ResilienceContainer.instance;
  }

  private initializeServices(): void {
    // Register core services
    this.register('circuitBreakerFactory', CircuitBreakerFactory);
    this.register('retryFactory', RetryFactory);
    this.register('databaseResilienceFactory', DatabaseResilienceFactory);
    this.register('recoveryStrategyFactory', RecoveryStrategyFactory);
    this.register('faultToleranceMiddleware', new FaultToleranceMiddleware());
    this.register('failureMonitoring', globalFailureMonitoring);
    this.register('errorReporting', globalErrorReporting);

    console.log('🛡️ Resilience container initialized successfully');
  }

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered in resilience container`);
    }
    return service as T;
  }

  // Convenience methods for accessing services
  getCircuitBreakerFactory(): typeof CircuitBreakerFactory {
    return this.resolve<typeof CircuitBreakerFactory>('circuitBreakerFactory');
  }

  getRetryFactory(): typeof RetryFactory {
    return this.resolve<typeof RetryFactory>('retryFactory');
  }

  getDatabaseResilienceFactory(): typeof DatabaseResilienceFactory {
    return this.resolve<typeof DatabaseResilienceFactory>('databaseResilienceFactory');
  }

  getRecoveryStrategyFactory(): typeof RecoveryStrategyFactory {
    return this.resolve<typeof RecoveryStrategyFactory>('recoveryStrategyFactory');
  }

  getFaultToleranceMiddleware(): FaultToleranceMiddleware {
    return this.resolve<FaultToleranceMiddleware>('faultToleranceMiddleware');
  }

  getFailureMonitoring(): FailureMonitoringService {
    return this.resolve<FailureMonitoringService>('failureMonitoring');
  }

  getErrorReporting(): ErrorReportingService {
    return this.resolve<ErrorReportingService>('errorReporting');
  }

  // Health check for all resilience services
  async performHealthCheck(): Promise<ResilienceHealthStatus> {
    const healthStatus: ResilienceHealthStatus = {
      timestamp: new Date(),
      overall: 'healthy',
      services: {}
    };

    try {
      // Check circuit breakers
      const circuitBreakers = CircuitBreakerFactory.getAll();
      const openCircuitBreakers = Array.from(circuitBreakers.values())
        .filter(cb => cb.isOpen()).length;
      
      healthStatus.services.circuitBreakers = {
        status: openCircuitBreakers > 0 ? 'degraded' : 'healthy',
        metrics: {
          total: circuitBreakers.size,
          open: openCircuitBreakers,
          closed: circuitBreakers.size - openCircuitBreakers
        }
      };

      // Check failure monitoring
      const failureMetrics = globalFailureMonitoring.getMetrics();
      healthStatus.services.failureMonitoring = {
        status: failureMetrics.failureRate > 50 ? 'unhealthy' : 
                failureMetrics.failureRate > 10 ? 'degraded' : 'healthy',
        metrics: {
          totalFailures: failureMetrics.totalFailures,
          failureRate: failureMetrics.failureRate,
          recoverySuccessRate: failureMetrics.recoverySuccessRate
        }
      };

      // Check error reporting
      const reportingMetrics = globalErrorReporting.getMetrics();
      healthStatus.services.errorReporting = {
        status: reportingMetrics.deliverySuccessRate < 90 ? 'degraded' : 'healthy',
        metrics: {
          totalReports: reportingMetrics.totalReports,
          deliverySuccessRate: reportingMetrics.deliverySuccessRate,
          failedDeliveries: reportingMetrics.failedDeliveries
        }
      };

      // Determine overall health
      const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
      if (serviceStatuses.includes('unhealthy')) {
        healthStatus.overall = 'unhealthy';
      } else if (serviceStatuses.includes('degraded')) {
        healthStatus.overall = 'degraded';
      }

    } catch (error) {
      healthStatus.overall = 'unhealthy';
      healthStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return healthStatus;
  }

  // Get comprehensive metrics for all resilience components
  getComprehensiveMetrics(): ResilienceMetrics {
    const circuitBreakers = CircuitBreakerFactory.getAll();
    const circuitBreakerMetrics = Array.from(circuitBreakers.entries()).reduce((acc, [name, cb]) => {
      acc[name] = cb.getMetrics();
      return acc;
    }, {} as Record<string, any>);

    const failureMetrics = globalFailureMonitoring.getMetrics();
    const reportingMetrics = globalErrorReporting.getMetrics();

    return {
      timestamp: new Date(),
      circuitBreakers: circuitBreakerMetrics,
      failures: failureMetrics,
      reporting: reportingMetrics,
      summary: {
        totalCircuitBreakers: circuitBreakers.size,
        openCircuitBreakers: Array.from(circuitBreakers.values()).filter(cb => cb.isOpen()).length,
        totalFailures: failureMetrics.totalFailures,
        totalReports: reportingMetrics.totalReports,
        overallHealth: this.calculateOverallHealth(circuitBreakerMetrics, failureMetrics, reportingMetrics)
      }
    };
  }

  private calculateOverallHealth(
    circuitBreakers: Record<string, any>,
    failures: any,
    reporting: any
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const openCircuitBreakers = Object.values(circuitBreakers)
      .filter((cb: any) => cb.state === 'open').length;
    
    if (openCircuitBreakers > 2 || failures.failureRate > 50 || reporting.deliverySuccessRate < 80) {
      return 'unhealthy';
    }
    
    if (openCircuitBreakers > 0 || failures.failureRate > 10 || reporting.deliverySuccessRate < 95) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  reset(): void {
    // Reset all circuit breakers
    CircuitBreakerFactory.reset();
    
    // Clear monitoring data (if needed in development)
    // Note: In production, you might not want to clear historical data
    console.log('🔄 Resilience container reset completed');
  }
}

export interface ResilienceHealthStatus {
  timestamp: Date;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: Record<string, any>;
  }>;
  error?: string;
}

export interface ResilienceMetrics {
  timestamp: Date;
  circuitBreakers: Record<string, any>;
  failures: any;
  reporting: any;
  summary: {
    totalCircuitBreakers: number;
    openCircuitBreakers: number;
    totalFailures: number;
    totalReports: number;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  };
}

// Convenience functions for accessing the resilience container
export const getResilience = () => ResilienceContainer.getInstance();
export const performResilienceHealthCheck = () => ResilienceContainer.getInstance().performHealthCheck();
export const getResilienceMetrics = () => ResilienceContainer.getInstance().getComprehensiveMetrics();

// React context for resilience services
export const ResilienceContext = React.createContext<ResilienceContainer | null>(null);

export function ResilienceProvider({ children }: { children: React.ReactNode }) {
  const container = React.useMemo(() => ResilienceContainer.getInstance(), []);

  return (
    <ResilienceContext.Provider value={container}>
      {children}
    </ResilienceContext.Provider>
  );
}

export function useResilience() {
  const container = React.useContext(ResilienceContext);
  
  if (!container) {
    throw new Error('useResilience must be used within a ResilienceProvider');
  }

  return {
    container,
    circuitBreakerFactory: container.getCircuitBreakerFactory(),
    retryFactory: container.getRetryFactory(),
    databaseResilienceFactory: container.getDatabaseResilienceFactory(),
    recoveryStrategyFactory: container.getRecoveryStrategyFactory(),
    faultToleranceMiddleware: container.getFaultToleranceMiddleware(),
    failureMonitoring: container.getFailureMonitoring(),
    errorReporting: container.getErrorReporting(),
    healthCheck: container.performHealthCheck.bind(container),
    getMetrics: container.getComprehensiveMetrics.bind(container)
  };
}

import React from 'react';