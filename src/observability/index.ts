/**
 * Observability System - Main Export
 * Comprehensive monitoring, tracing, logging, and metrics collection
 */

// Core observability infrastructure
export * from './ObservabilityCore';
export * from './Logger';
export * from './DistributedTracing';
export * from './MetricsCollector';
export * from './ResilienceIntegration';

// Dashboard and visualizations
export { default as ObservabilityDashboard } from './ObservabilityDashboard';

// Re-export main instances
export { observability } from './ObservabilityCore';
export { logger, LoggerFactory } from './Logger';
export { distributedTracing } from './DistributedTracing';
export { metricsCollector } from './MetricsCollector';
export { resilienceObservability } from './ResilienceIntegration';
export { performanceMonitoring } from './PerformanceMonitoring';
export { alertingSystem } from './AlertingSystem';

// Convenience instrumentation helpers
import { observability, TraceContext } from './ObservabilityCore';
import { logger } from './Logger';
import { distributedTracing } from './DistributedTracing';
import { metricsCollector } from './MetricsCollector';
import { resilienceObservability } from './ResilienceIntegration';

/**
 * High-level instrumentation for HTTP requests
 */
export async function instrumentHttpRequest<T>(
  method: string,
  url: string,
  operation: (context: TraceContext) => Promise<T>,
  parentContext?: TraceContext
): Promise<T> {
  return distributedTracing.traceAsync(
    `http.${method.toLowerCase()}`,
    async (context) => {
      distributedTracing.instrumentHttpRequest(context, method, url);
      
      const startTime = Date.now();
      const requestLogger = logger.withCorrelation(context);
      
      try {
        requestLogger.info(`${method} ${url} - Starting request`);
        
        const result = await operation(context);
        const duration = Date.now() - startTime;
        
        // Assume success if no error thrown
        distributedTracing.instrumentHttpResponse(context, 200);
        requestLogger.http(method, url, 200, duration);
        metricsCollector.recordApiMetrics(method, url, 200, duration);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const statusCode = (error as any).statusCode || 500;
        
        distributedTracing.instrumentHttpResponse(context, statusCode);
        requestLogger.http(method, url, statusCode, duration, { error: error instanceof Error ? error.message : String(error) });
        metricsCollector.recordApiMetrics(method, url, statusCode, duration);
        
        throw error;
      }
    },
    parentContext
  );
}

/**
 * High-level instrumentation for database operations
 */
export async function instrumentDatabaseOperation<T>(
  operation: string,
  table: string,
  query: (context: TraceContext) => Promise<T>,
  parentContext?: TraceContext
): Promise<T> {
  return distributedTracing.traceAsync(
    `db.${operation}`,
    async (context) => {
      distributedTracing.instrumentDatabase(context, operation, table);
      
      const startTime = Date.now();
      const dbLogger = logger.withCorrelation(context);
      
      try {
        dbLogger.debug(`Database ${operation} on ${table} - Starting`);
        
        const result = await query(context);
        const duration = Date.now() - startTime;
        
        dbLogger.database(operation, table, duration);
        metricsCollector.recordDatabaseQuery(operation, table, duration);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        dbLogger.database(operation, table, duration, undefined, { 
          error: error instanceof Error ? error.message : String(error) 
        });
        metricsCollector.recordDatabaseQuery(operation, table, duration);
        
        throw error;
      }
    },
    parentContext
  );
}

/**
 * High-level instrumentation for cache operations
 */
export async function instrumentCacheOperation<T>(
  operation: string,
  key: string,
  cacheOperation: (context: TraceContext) => Promise<T>,
  parentContext?: TraceContext
): Promise<T> {
  return distributedTracing.traceAsync(
    `cache.${operation}`,
    async (context) => {
      const startTime = Date.now();
      const cacheLogger = logger.withCorrelation(context);
      
      try {
        cacheLogger.debug(`Cache ${operation} for key ${key} - Starting`);
        
        const result = await cacheOperation(context);
        const duration = Date.now() - startTime;
        const hit = operation === 'get' && result !== null && result !== undefined;
        
        distributedTracing.instrumentCache(context, operation, key, hit);
        cacheLogger.cache(operation, key, hit, duration);
        metricsCollector.recordCacheMetrics(operation, key, hit, duration);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        distributedTracing.instrumentCache(context, operation, key, false);
        cacheLogger.cache(operation, key, false, duration, { 
          error: error instanceof Error ? error.message : String(error) 
        });
        metricsCollector.recordCacheMetrics(operation, key, false, duration);
        
        throw error;
      }
    },
    parentContext
  );
}

/**
 * High-level instrumentation for business operations
 */
export async function instrumentBusinessOperation<T>(
  operationName: string,
  businessLogic: (context: TraceContext) => Promise<T>,
  metadata?: Record<string, any>,
  parentContext?: TraceContext
): Promise<T> {
  return distributedTracing.traceAsync(
    `business.${operationName}`,
    async (context) => {
      const startTime = Date.now();
      const businessLogger = logger.withCorrelation(context);
      
      try {
        businessLogger.info(`Business operation ${operationName} - Starting`, metadata);
        
        const result = await businessLogic(context);
        const duration = Date.now() - startTime;
        
        businessLogger.business(operationName, 1, { duration, success: true, ...metadata });
        metricsCollector.recordBusinessEvent(operationName, 1, { duration, success: true, ...metadata });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        businessLogger.business(operationName, 1, { 
          duration, 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          ...metadata 
        });
        metricsCollector.recordBusinessEvent(operationName, 1, { 
          duration, 
          success: false, 
          ...metadata 
        });
        
        throw error;
      }
    },
    parentContext
  );
}

/**
 * Simplified user action tracking
 */
export function trackUserAction(
  action: string,
  userId?: string,
  metadata?: Record<string, any>,
  context?: TraceContext
): void {
  // Record metrics
  metricsCollector.recordUserAction(action, userId, metadata);
  
  // Log action
  const actionLogger = context ? logger.withCorrelation(context) : logger;
  actionLogger.info(`User action: ${action}`, {
    user_id: userId,
    action,
    ...metadata,
    component: 'user_tracking'
  });
  
  // Add to trace if context provided
  if (context) {
    distributedTracing.addSpanTag(context, 'user.action', action);
    if (userId) {
      distributedTracing.addSpanTag(context, 'user.id', userId);
    }
    distributedTracing.addSpanLog(context, 'user.action', {
      action,
      user_id: userId,
      ...metadata
    });
  }
}

/**
 * Error tracking with observability integration
 */
export function trackError(
  error: Error,
  component: string,
  operation: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  context?: TraceContext,
  metadata?: Record<string, any>
): void {
  // Record error metrics
  metricsCollector.recordCounter('errors.total', 1, {
    component,
    operation,
    severity,
    error_type: error.constructor.name
  });
  
  // Log error
  const errorLogger = context ? logger.withCorrelation(context) : logger;
  errorLogger.error(`${severity.toUpperCase()} error in ${component}.${operation}`, error, {
    component,
    operation,
    severity,
    error_type: error.constructor.name,
    ...metadata
  });
  
  // Add to trace if context provided
  if (context) {
    distributedTracing.addSpanTag(context, 'error', true);
    distributedTracing.addSpanTag(context, 'error.component', component);
    distributedTracing.addSpanTag(context, 'error.operation', operation);
    distributedTracing.addSpanTag(context, 'error.severity', severity);
    distributedTracing.addSpanLog(context, 'error', {
      component,
      operation,
      severity,
      error_type: error.constructor.name,
      error_message: error.message,
      ...metadata
    });
  }
  
  // Security logging for critical errors
  if (severity === 'critical') {
    logger.security('critical_error', context?.userId, {
      component,
      operation,
      error_type: error.constructor.name,
      error_message: error.message,
      stack_trace: error.stack,
      ...metadata
    });
  }
}

/**
 * Performance monitoring helper
 */
export function measurePerformance<T>(
  operationName: string,
  operation: () => T,
  thresholds?: { warning: number; critical: number },
  context?: TraceContext
): T {
  const endTimer = metricsCollector.startTimer(`performance.${operationName}`);
  const startTime = Date.now();
  
  try {
    const result = operation();
    const duration = endTimer();
    
    // Check performance thresholds
    if (thresholds) {
      if (duration > thresholds.critical) {
        logger.error(`Critical performance issue in ${operationName}`, undefined, {
          operation: operationName,
          duration,
          threshold: thresholds.critical,
          component: 'performance'
        });
      } else if (duration > thresholds.warning) {
        logger.warn(`Performance warning in ${operationName}`, {
          operation: operationName,
          duration,
          threshold: thresholds.warning,
          component: 'performance'
        });
      }
    }
    
    // Add to trace if context provided
    if (context) {
      distributedTracing.addSpanTag(context, 'performance.operation', operationName);
      distributedTracing.addSpanTag(context, 'performance.duration_ms', duration);
    }
    
    logger.performance(operationName, duration);
    
    return result;
  } catch (error) {
    endTimer();
    throw error;
  }
}

/**
 * Async performance monitoring helper
 */
export async function measurePerformanceAsync<T>(
  operationName: string,
  operation: () => Promise<T>,
  thresholds?: { warning: number; critical: number },
  context?: TraceContext
): Promise<T> {
  const endTimer = metricsCollector.startTimer(`performance.${operationName}`);
  
  try {
    const result = await operation();
    const duration = endTimer();
    
    // Check performance thresholds
    if (thresholds) {
      if (duration > thresholds.critical) {
        logger.error(`Critical performance issue in ${operationName}`, undefined, {
          operation: operationName,
          duration,
          threshold: thresholds.critical,
          component: 'performance'
        });
      } else if (duration > thresholds.warning) {
        logger.warn(`Performance warning in ${operationName}`, {
          operation: operationName,
          duration,
          threshold: thresholds.warning,
          component: 'performance'
        });
      }
    }
    
    // Add to trace if context provided
    if (context) {
      distributedTracing.addSpanTag(context, 'performance.operation', operationName);
      distributedTracing.addSpanTag(context, 'performance.duration_ms', duration);
    }
    
    logger.performance(operationName, duration);
    
    return result;
  } catch (error) {
    endTimer();
    throw error;
  }
}

/**
 * Initialize the complete observability system
 */
export function initializeObservability(config?: {
  serviceName?: string;
  environment?: string;
  enableConsoleOutput?: boolean;
  enableFileOutput?: boolean;
  enableHttpExports?: boolean;
  endpoints?: {
    metrics?: string;
    traces?: string;
    logs?: string;
  };
}): void {
  const finalConfig = {
    serviceName: 'vsr-landing',
    environment: process.env.NODE_ENV || 'development',
    enableConsoleOutput: true,
    enableFileOutput: false,
    enableHttpExports: false,
    ...config
  };

  logger.info('Initializing observability system', {
    service_name: finalConfig.serviceName,
    environment: finalConfig.environment,
    console_output: finalConfig.enableConsoleOutput,
    file_output: finalConfig.enableFileOutput,
    http_exports: finalConfig.enableHttpExports,
    component: 'observability_init'
  });

  // Record system startup
  metricsCollector.recordCounter('system.startup', 1, {
    service: finalConfig.serviceName,
    environment: finalConfig.environment
  });

  // Start system metrics collection
  setInterval(() => {
    metricsCollector.recordSystemMetrics();
  }, 30000); // Every 30 seconds

  logger.info('Observability system initialized successfully', {
    service_name: finalConfig.serviceName,
    environment: finalConfig.environment,
    component: 'observability_init'
  });
}

/**
 * Get comprehensive system health status
 */
export async function getSystemHealth(): Promise<{
  observability: any;
  resilience: any;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}> {
  try {
    const [observabilityHealth, resilienceHealth] = await Promise.all([
      observability.getHealthStatus(),
      resilienceObservability.monitorResilienceHealth()
    ]);

    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (observabilityHealth.status === 'unhealthy' || resilienceHealth.overall === 'unhealthy') {
      overall = 'unhealthy';
    } else if (observabilityHealth.status === 'degraded' || resilienceHealth.overall === 'degraded') {
      overall = 'degraded';
    }

    return {
      observability: observabilityHealth,
      resilience: resilienceHealth,
      overall
    };
  } catch (error) {
    logger.error('Failed to get system health', error as Error, {
      component: 'health_check'
    });
    
    return {
      observability: { status: 'unhealthy', error: 'Health check failed' },
      resilience: { overall: 'unhealthy', error: 'Health check failed' },
      overall: 'unhealthy'
    };
  }
}

// Export types for external use
export type {
  TraceContext,
  LogLevel,
  MetricType,
  SpanStatus,
  ObservabilityConfig,
  ObservabilityHealth
} from './ObservabilityCore';

export type {
  LoggerConfig,
  LogEntryInternal
} from './Logger';

export type {
  TraceConfig,
  TraceSpan,
  TraceMetadata
} from './DistributedTracing';

export type {
  MetricsConfig,
  AggregatedMetric,
  TimeSeries
} from './MetricsCollector';

export type {
  ResilienceObservabilityConfig,
  CircuitBreakerEvent,
  RetryEvent,
  FailureEvent
} from './ResilienceIntegration';

export type {
  PerformanceConfig,
  PerformanceThresholds,
  WebVitals,
  PerformanceProfile,
  PerformanceAlert,
  ApdexScore
} from './PerformanceMonitoring';

export type {
  AlertConfig,
  AlertRule,
  AlertChannel,
  Alert,
  AlertSeverity,
  AlertNotification
} from './AlertingSystem';