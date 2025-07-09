/**
 * Resilience Integration - Connect observability with resilience patterns
 * Comprehensive monitoring and tracing of circuit breakers, retries, and failure recovery
 */

import { observability, TraceContext, SpanStatus } from './ObservabilityCore';
import { logger } from './Logger';
import { metricsCollector } from './MetricsCollector';
import { distributedTracing } from './DistributedTracing';
import { 
  getResilience, 
  ResilienceContainer, 
  ResilienceHealthStatus, 
  ResilienceMetrics 
} from '../resilience';

export interface ResilienceObservabilityConfig {
  enableCircuitBreakerTracing: boolean;
  enableRetryTracing: boolean;
  enableFailureCorrelation: boolean;
  metricsPrefix: string;
  alertThresholds: {
    circuitBreakerOpenRate: number;
    failureRate: number;
    retryExhaustionRate: number;
    recoveryFailureRate: number;
  };
}

export interface CircuitBreakerEvent {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  previousState: 'closed' | 'open' | 'half-open';
  failureCount: number;
  requestCount: number;
  errorRate: number;
  context?: TraceContext;
}

export interface RetryEvent {
  operation: string;
  attempt: number;
  maxAttempts: number;
  delay: number;
  error?: Error;
  success: boolean;
  totalDuration: number;
  context?: TraceContext;
}

export interface FailureEvent {
  component: string;
  operation: string;
  error: Error;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoveryStrategy?: string;
  recoverySuccess?: boolean;
  context?: TraceContext;
}

export class ResilienceObservability {
  private config: ResilienceObservabilityConfig;
  private resilienceContainer: ResilienceContainer;
  private activeOperations = new Map<string, TraceContext>();

  constructor(config: Partial<ResilienceObservabilityConfig> = {}) {
    this.config = {
      enableCircuitBreakerTracing: true,
      enableRetryTracing: true,
      enableFailureCorrelation: true,
      metricsPrefix: 'resilience',
      alertThresholds: {
        circuitBreakerOpenRate: 10,    // 10% of circuit breakers open
        failureRate: 5,                // 5% failure rate
        retryExhaustionRate: 2,        // 2% retry exhaustion rate
        recoveryFailureRate: 15        // 15% recovery failure rate
      },
      ...config
    };

    this.resilienceContainer = getResilience();
    this.initializeIntegration();
  }

  // Circuit Breaker Observability
  recordCircuitBreakerStateChange(event: CircuitBreakerEvent): void {
    const tags = {
      circuit_breaker: event.name,
      from_state: event.previousState,
      to_state: event.state,
      component: 'circuit_breaker'
    };

    // Record metrics
    metricsCollector.recordCounter(`${this.config.metricsPrefix}.circuit_breaker.state_changes`, 1, tags);
    metricsCollector.recordGauge(`${this.config.metricsPrefix}.circuit_breaker.failure_count`, event.failureCount, tags);
    metricsCollector.recordGauge(`${this.config.metricsPrefix}.circuit_breaker.request_count`, event.requestCount, tags);
    metricsCollector.recordGauge(`${this.config.metricsPrefix}.circuit_breaker.error_rate`, event.errorRate, tags);

    // Record business impact
    if (event.state === 'open') {
      metricsCollector.recordCounter(`${this.config.metricsPrefix}.circuit_breaker.opened`, 1, tags);
      metricsCollector.recordBusinessEvent('circuit_breaker_opened', 1, {
        circuit_breaker: event.name,
        error_rate: event.errorRate,
        failure_count: event.failureCount
      });
    }

    // Create trace span if context provided
    if (event.context && this.config.enableCircuitBreakerTracing) {
      const span = distributedTracing.startChildSpan(
        `circuit_breaker.${event.state}`,
        event.context,
        {
          customTags: {
            'circuit_breaker.name': event.name,
            'circuit_breaker.state': event.state,
            'circuit_breaker.previous_state': event.previousState,
            'circuit_breaker.failure_count': event.failureCount.toString(),
            'circuit_breaker.error_rate': event.errorRate.toString()
          }
        }
      );

      distributedTracing.addSpanLog(span, 'circuit_breaker.state_change', {
        name: event.name,
        from_state: event.previousState,
        to_state: event.state,
        failure_count: event.failureCount,
        request_count: event.requestCount,
        error_rate: event.errorRate
      });

      distributedTracing.finishSpan(span, event.state === 'open' ? SpanStatus.ERROR : SpanStatus.OK);
    }

    // Log event
    const logLevel = event.state === 'open' ? 'warn' : 'info';
    logger.withCorrelation(event.context || {} as TraceContext)[logLevel](
      `Circuit breaker ${event.name} changed state: ${event.previousState} → ${event.state}`,
      {
        circuit_breaker: event.name,
        from_state: event.previousState,
        to_state: event.state,
        failure_count: event.failureCount,
        request_count: event.requestCount,
        error_rate: event.errorRate,
        component: 'circuit_breaker'
      }
    );

    // Check alert thresholds
    this.checkCircuitBreakerAlerts();
  }

  recordCircuitBreakerRequest(circuitBreakerName: string, success: boolean, duration: number, context?: TraceContext): void {
    const tags = {
      circuit_breaker: circuitBreakerName,
      success: success.toString(),
      component: 'circuit_breaker'
    };

    metricsCollector.recordCounter(`${this.config.metricsPrefix}.circuit_breaker.requests`, 1, tags);
    metricsCollector.recordTimer(`${this.config.metricsPrefix}.circuit_breaker.request`, duration, tags);

    if (!success) {
      metricsCollector.recordCounter(`${this.config.metricsPrefix}.circuit_breaker.failures`, 1, tags);
    }

    if (context && this.config.enableCircuitBreakerTracing) {
      distributedTracing.addSpanTag(context, 'circuit_breaker.name', circuitBreakerName);
      distributedTracing.addSpanTag(context, 'circuit_breaker.success', success);
      distributedTracing.addSpanTag(context, 'circuit_breaker.duration_ms', duration);
    }
  }

  // Retry Logic Observability
  recordRetryAttempt(event: RetryEvent): void {
    const tags = {
      operation: event.operation,
      attempt: event.attempt.toString(),
      max_attempts: event.maxAttempts.toString(),
      success: event.success.toString(),
      component: 'retry'
    };

    metricsCollector.recordCounter(`${this.config.metricsPrefix}.retry.attempts`, 1, tags);
    metricsCollector.recordTimer(`${this.config.metricsPrefix}.retry.delay`, event.delay, tags);

    if (event.success) {
      metricsCollector.recordCounter(`${this.config.metricsPrefix}.retry.successes`, 1, tags);
      metricsCollector.recordTimer(`${this.config.metricsPrefix}.retry.total_duration`, event.totalDuration, tags);
    } else if (event.attempt >= event.maxAttempts) {
      metricsCollector.recordCounter(`${this.config.metricsPrefix}.retry.exhausted`, 1, tags);
      metricsCollector.recordBusinessEvent('retry_exhausted', 1, {
        operation: event.operation,
        attempts: event.attempt,
        duration: event.totalDuration
      });
    }

    // Create trace span if context provided
    if (event.context && this.config.enableRetryTracing) {
      const span = distributedTracing.startChildSpan(
        `retry.attempt_${event.attempt}`,
        event.context,
        {
          customTags: {
            'retry.operation': event.operation,
            'retry.attempt': event.attempt.toString(),
            'retry.max_attempts': event.maxAttempts.toString(),
            'retry.delay_ms': event.delay.toString(),
            'retry.success': event.success.toString()
          }
        }
      );

      if (event.error) {
        distributedTracing.addSpanLog(span, 'retry.error', {
          error_type: event.error.constructor.name,
          error_message: event.error.message,
          attempt: event.attempt,
          will_retry: event.attempt < event.maxAttempts
        });
      }

      distributedTracing.finishSpan(
        span, 
        event.success ? SpanStatus.OK : SpanStatus.ERROR, 
        event.error
      );
    }

    // Log event
    const message = `Retry ${event.operation} attempt ${event.attempt}/${event.maxAttempts}: ${event.success ? 'SUCCESS' : 'FAILED'}`;
    const metadata = {
      operation: event.operation,
      attempt: event.attempt,
      max_attempts: event.maxAttempts,
      delay_ms: event.delay,
      success: event.success,
      total_duration_ms: event.totalDuration,
      component: 'retry'
    };
    
    const correlatedLogger = logger.withCorrelation(event.context || {} as TraceContext);
    
    if (event.success) {
      correlatedLogger.debug(message, metadata);
    } else if (event.attempt >= event.maxAttempts) {
      correlatedLogger.error(message, event.error, metadata);
    } else {
      correlatedLogger.warn(message, metadata);
    }

    // Check alert thresholds
    this.checkRetryAlerts();
  }

  // Failure Recovery Observability
  recordFailureEvent(event: FailureEvent): void {
    const tags = {
      component: event.component,
      operation: event.operation,
      severity: event.severity,
      error_type: event.error.constructor.name,
      recovery_strategy: event.recoveryStrategy || 'none',
      recovery_success: event.recoverySuccess?.toString() || 'unknown'
    };

    metricsCollector.recordCounter(`${this.config.metricsPrefix}.failures.total`, 1, tags);
    metricsCollector.recordCounter(`${this.config.metricsPrefix}.failures.by_severity`, 1, {
      ...tags,
      severity: event.severity
    });

    if (event.recoveryStrategy) {
      metricsCollector.recordCounter(`${this.config.metricsPrefix}.recovery.attempts`, 1, tags);
      
      if (event.recoverySuccess !== undefined) {
        metricsCollector.recordCounter(
          `${this.config.metricsPrefix}.recovery.${event.recoverySuccess ? 'successes' : 'failures'}`,
          1,
          tags
        );
      }
    }

    // Record business impact
    metricsCollector.recordBusinessEvent('system_failure', 1, {
      component: event.component,
      operation: event.operation,
      severity: event.severity,
      error_type: event.error.constructor.name,
      recovery_attempted: !!event.recoveryStrategy
    });

    // Create trace span if context provided
    if (event.context && this.config.enableFailureCorrelation) {
      const span = distributedTracing.startChildSpan(
        `failure.${event.severity}`,
        event.context,
        {
          errorType: event.error.constructor.name,
          customTags: {
            'failure.component': event.component,
            'failure.operation': event.operation,
            'failure.severity': event.severity,
            'failure.recovery_strategy': event.recoveryStrategy || 'none',
            'failure.recovery_success': event.recoverySuccess?.toString() || 'unknown'
          }
        }
      );

      distributedTracing.addSpanLog(span, 'failure.occurred', {
        component: event.component,
        operation: event.operation,
        severity: event.severity,
        error_type: event.error.constructor.name,
        error_message: event.error.message,
        recovery_strategy: event.recoveryStrategy
      });

      if (event.recoveryStrategy && event.recoverySuccess !== undefined) {
        distributedTracing.addSpanLog(span, 'recovery.completed', {
          strategy: event.recoveryStrategy,
          success: event.recoverySuccess,
          result: event.recoverySuccess ? 'recovered' : 'failed_to_recover'
        });
      }

      distributedTracing.finishSpan(span, SpanStatus.ERROR, event.error);
    }

    // Log failure
    logger.withCorrelation(event.context || {} as TraceContext).error(
      `${event.severity.toUpperCase()} failure in ${event.component}.${event.operation}`,
      event.error,
      {
        component: event.component,
        operation: event.operation,
        severity: event.severity,
        error_type: event.error.constructor.name,
        recovery_strategy: event.recoveryStrategy,
        recovery_success: event.recoverySuccess,
        stack_trace: event.error.stack
      }
    );

    // Security logging for critical failures
    if (event.severity === 'critical') {
      logger.security('critical_failure', event.context?.userId, {
        component: event.component,
        operation: event.operation,
        error_type: event.error.constructor.name,
        error_message: event.error.message,
        recovery_attempted: !!event.recoveryStrategy,
        recovery_success: event.recoverySuccess
      });
    }

    // Check alert thresholds
    this.checkFailureAlerts();
  }

  // Health Monitoring
  async monitorResilienceHealth(): Promise<ResilienceHealthStatus> {
    const context = distributedTracing.startTrace('resilience.health_check');
    
    try {
      const healthStatus = await this.resilienceContainer.performHealthCheck();
      
      // Record health metrics
      const healthScore = this.calculateHealthScore(healthStatus);
      metricsCollector.recordGauge(`${this.config.metricsPrefix}.health.score`, healthScore);
      metricsCollector.recordGauge(`${this.config.metricsPrefix}.health.overall`, 
        healthStatus.overall === 'healthy' ? 100 : healthStatus.overall === 'degraded' ? 50 : 0
      );

      // Record service-specific health
      for (const [serviceName, serviceHealth] of Object.entries(healthStatus.services)) {
        const serviceScore = serviceHealth.status === 'healthy' ? 100 : 
                           serviceHealth.status === 'degraded' ? 50 : 0;
        
        metricsCollector.recordGauge(`${this.config.metricsPrefix}.health.service`, serviceScore, {
          service: serviceName
        });

        // Record service metrics
        for (const [metricName, metricValue] of Object.entries(serviceHealth.metrics)) {
          if (typeof metricValue === 'number') {
            metricsCollector.recordGauge(
              `${this.config.metricsPrefix}.service.${serviceName}.${metricName}`,
              metricValue
            );
          }
        }
      }

      distributedTracing.addSpanTag(context, 'health.overall', healthStatus.overall);
      distributedTracing.addSpanTag(context, 'health.score', healthScore);
      distributedTracing.finishSpan(context, SpanStatus.OK);

      logger.withCorrelation(context).info('Resilience health check completed', {
        overall: healthStatus.overall,
        score: healthScore,
        services: Object.keys(healthStatus.services),
        component: 'resilience_health'
      });

      return healthStatus;
    } catch (error) {
      distributedTracing.finishSpan(context, SpanStatus.ERROR, error as Error);
      logger.withCorrelation(context).error('Resilience health check failed', error as Error);
      throw error;
    }
  }

  // Metrics Collection
  collectResilienceMetrics(): ResilienceMetrics {
    const context = distributedTracing.startTrace('resilience.metrics_collection');
    
    try {
      const metrics = this.resilienceContainer.getComprehensiveMetrics();
      
      // Export metrics to our observability system
      this.exportResilienceMetrics(metrics);
      
      distributedTracing.addSpanTag(context, 'metrics.circuit_breakers', metrics.summary.totalCircuitBreakers);
      distributedTracing.addSpanTag(context, 'metrics.open_circuit_breakers', metrics.summary.openCircuitBreakers);
      distributedTracing.addSpanTag(context, 'metrics.total_failures', metrics.summary.totalFailures);
      distributedTracing.finishSpan(context, SpanStatus.OK);

      logger.withCorrelation(context).debug('Resilience metrics collected', {
        total_circuit_breakers: metrics.summary.totalCircuitBreakers,
        open_circuit_breakers: metrics.summary.openCircuitBreakers,
        total_failures: metrics.summary.totalFailures,
        overall_health: metrics.summary.overallHealth,
        component: 'resilience_metrics'
      });

      return metrics;
    } catch (error) {
      distributedTracing.finishSpan(context, SpanStatus.ERROR, error as Error);
      logger.withCorrelation(context).error('Resilience metrics collection failed', error as Error);
      throw error;
    }
  }

  // Alert checking methods
  private checkCircuitBreakerAlerts(): void {
    const metrics = this.resilienceContainer.getComprehensiveMetrics();
    const openRate = (metrics.summary.openCircuitBreakers / Math.max(metrics.summary.totalCircuitBreakers, 1)) * 100;
    
    if (openRate >= this.config.alertThresholds.circuitBreakerOpenRate) {
      this.triggerAlert('circuit_breaker_open_rate', {
        current_rate: openRate,
        threshold: this.config.alertThresholds.circuitBreakerOpenRate,
        open_circuit_breakers: metrics.summary.openCircuitBreakers,
        total_circuit_breakers: metrics.summary.totalCircuitBreakers
      });
    }
  }

  private checkRetryAlerts(): void {
    // Get recent retry metrics and check exhaustion rate
    const recentMetrics = metricsCollector.getMetricValues(`${this.config.metricsPrefix}.retry.exhausted`, {}, {
      start: Date.now() - 300000, // Last 5 minutes
      end: Date.now()
    });

    if (recentMetrics.length > 0) {
      const exhaustionRate = recentMetrics.reduce((sum, point) => sum + point.value, 0);
      
      if (exhaustionRate >= this.config.alertThresholds.retryExhaustionRate) {
        this.triggerAlert('retry_exhaustion_rate', {
          current_rate: exhaustionRate,
          threshold: this.config.alertThresholds.retryExhaustionRate,
          time_window: '5 minutes'
        });
      }
    }
  }

  private checkFailureAlerts(): void {
    // Calculate failure rate
    const recentFailures = metricsCollector.getMetricValues(`${this.config.metricsPrefix}.failures.total`, {}, {
      start: Date.now() - 300000, // Last 5 minutes
      end: Date.now()
    });

    if (recentFailures.length > 0) {
      const failureCount = recentFailures.reduce((sum, point) => sum + point.value, 0);
      
      if (failureCount >= this.config.alertThresholds.failureRate) {
        this.triggerAlert('high_failure_rate', {
          failure_count: failureCount,
          threshold: this.config.alertThresholds.failureRate,
          time_window: '5 minutes'
        });
      }
    }
  }

  private triggerAlert(alertType: string, details: Record<string, any>): void {
    metricsCollector.recordCounter(`${this.config.metricsPrefix}.alerts.triggered`, 1, {
      alert_type: alertType
    });

    logger.warn(`Resilience alert triggered: ${alertType}`, {
      alert_type: alertType,
      details,
      component: 'resilience_alert'
    });

    // Record business event for critical alerts
    metricsCollector.recordBusinessEvent('resilience_alert', 1, {
      alert_type: alertType,
      ...details
    });
  }

  private calculateHealthScore(healthStatus: ResilienceHealthStatus): number {
    if (healthStatus.overall === 'healthy') return 100;
    if (healthStatus.overall === 'degraded') return 50;
    return 0;
  }

  private exportResilienceMetrics(metrics: ResilienceMetrics): void {
    // Export circuit breaker metrics
    for (const [name, cbMetrics] of Object.entries(metrics.circuitBreakers)) {
      const tags = { circuit_breaker: name };
      
      if (typeof cbMetrics === 'object' && cbMetrics !== null) {
        for (const [key, value] of Object.entries(cbMetrics)) {
          if (typeof value === 'number') {
            metricsCollector.recordGauge(`${this.config.metricsPrefix}.circuit_breaker.${key}`, value, tags);
          }
        }
      }
    }

    // Export failure metrics
    if (metrics.failures && typeof metrics.failures === 'object') {
      for (const [key, value] of Object.entries(metrics.failures)) {
        if (typeof value === 'number') {
          metricsCollector.recordGauge(`${this.config.metricsPrefix}.failures.${key}`, value);
        }
      }
    }

    // Export reporting metrics
    if (metrics.reporting && typeof metrics.reporting === 'object') {
      for (const [key, value] of Object.entries(metrics.reporting)) {
        if (typeof value === 'number') {
          metricsCollector.recordGauge(`${this.config.metricsPrefix}.reporting.${key}`, value);
        }
      }
    }
  }

  private initializeIntegration(): void {
    // Set up periodic health monitoring
    setInterval(() => {
      this.monitorResilienceHealth().catch(error => {
        logger.error('Resilience health monitoring failed', error as Error, {
          component: 'resilience_integration'
        });
      });
    }, 60000); // Every minute

    // Set up periodic metrics collection
    setInterval(() => {
      this.collectResilienceMetrics();
    }, 30000); // Every 30 seconds

    logger.info('Resilience observability integration initialized', {
      enable_circuit_breaker_tracing: this.config.enableCircuitBreakerTracing,
      enable_retry_tracing: this.config.enableRetryTracing,
      enable_failure_correlation: this.config.enableFailureCorrelation,
      metrics_prefix: this.config.metricsPrefix,
      alert_thresholds: this.config.alertThresholds,
      component: 'resilience_integration'
    });
  }

  // Cleanup
  destroy(): void {
    // Clear intervals would go here if we tracked them
    logger.info('Resilience observability integration destroyed', {
      component: 'resilience_integration'
    });
  }
}

// Enhanced circuit breaker instrumentation helper
export async function instrumentCircuitBreaker<T>(
  circuitBreakerName: string,
  operation: () => Promise<T>,
  context?: TraceContext
): Promise<T> {
  return distributedTracing.traceAsync(
    `circuit_breaker.${circuitBreakerName}`,
    async (traceContext) => {
      const startTime = Date.now();
      
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        resilienceObservability.recordCircuitBreakerRequest(
          circuitBreakerName, 
          true, 
          duration, 
          traceContext
        );
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        resilienceObservability.recordCircuitBreakerRequest(
          circuitBreakerName, 
          false, 
          duration, 
          traceContext
        );
        
        throw error;
      }
    },
    context
  );
}

// Enhanced retry instrumentation helper
export async function instrumentRetry<T>(
  operation: string,
  retryFunction: () => Promise<T>,
  context?: TraceContext
): Promise<T> {
  return distributedTracing.traceAsync(
    `retry.${operation}`,
    retryFunction,
    context
  );
}

// Global instance
export const resilienceObservability = new ResilienceObservability();

// Export integration helpers
export {
  instrumentCircuitBreaker as withCircuitBreakerObservability,
  instrumentRetry as withRetryObservability
};