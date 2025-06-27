/**
 * Enterprise Monitoring and Observability System
 * ENTERPRISE PATTERN: Three Pillars of Observability (Metrics, Logs, Traces)
 * 
 * Features:
 * - Distributed tracing with correlation IDs
 * - Real-time metrics collection and aggregation
 * - Structured logging with context propagation
 * - Health checks and service discovery
 * - Performance monitoring and SLA tracking
 * - Alert management and escalation
 */

// ================== DISTRIBUTED TRACING ==================

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  baggage: Record<string, string>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, any>;
  logs: SpanLog[];
  status: SpanStatus;
  component: string;
}

export interface SpanLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, any>;
}

export enum SpanStatus {
  OK = 'ok',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

export class TracingService {
  private readonly activeSpans = new Map<string, Span>();
  private readonly completedSpans: Span[] = [];
  
  constructor(
    private readonly serviceName: string,
    private readonly serviceVersion: string,
    private readonly traceExporter?: TraceExporter
  ) {}
  
  startSpan(
    operationName: string,
    component: string,
    parentContext?: TraceContext
  ): TraceContext {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const correlationId = parentContext?.correlationId || this.generateCorrelationId();
    
    const span: Span = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      operationName,
      startTime: new Date(),
      tags: {
        service: this.serviceName,
        version: this.serviceVersion,
        component
      },
      logs: [],
      status: SpanStatus.OK,
      component
    };
    
    this.activeSpans.set(spanId, span);
    
    return {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      correlationId,
      baggage: parentContext?.baggage ? { ...parentContext.baggage } : {}
    };
  }
  
  addTag(context: TraceContext, key: string, value: any): void {
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.tags[key] = value;
    }
  }
  
  addLog(
    context: TraceContext,
    level: SpanLog['level'],
    message: string,
    fields?: Record<string, any>
  ): void {
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.logs.push({
        timestamp: new Date(),
        level,
        message,
        fields
      });
    }
  }
  
  setError(context: TraceContext, error: Error): void {
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.status = SpanStatus.ERROR;
      span.tags.error = true;
      span.tags.errorMessage = error.message;
      span.tags.errorType = error.name;
      
      this.addLog(context, 'error', error.message, {
        stack: error.stack,
        errorType: error.name
      });
    }
  }
  
  finishSpan(context: TraceContext): void {
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.endTime = new Date();
      span.duration = span.endTime.getTime() - span.startTime.getTime();
      
      this.activeSpans.delete(context.spanId);
      this.completedSpans.push(span);
      
      // Export span if exporter is configured
      if (this.traceExporter) {
        this.traceExporter.export([span]).catch(error => {
          console.error('Failed to export span:', error);
        });
      }
      
      // Maintain reasonable memory usage
      if (this.completedSpans.length > 1000) {
        this.completedSpans.splice(0, 500);
      }
    }
  }
  
  createChildContext(parentContext: TraceContext, baggage?: Record<string, string>): TraceContext {
    return {
      ...parentContext,
      spanId: this.generateSpanId(),
      parentSpanId: parentContext.spanId,
      baggage: { ...parentContext.baggage, ...baggage }
    };
  }
  
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
  
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  
  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans.values());
  }
  
  getCompletedSpans(): Span[] {
    return [...this.completedSpans];
  }
}

export interface TraceExporter {
  export(spans: Span[]): Promise<void>;
}

// ================== METRICS COLLECTION ==================

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export interface MetricPoint {
  timestamp: Date;
  value: number;
  tags: Record<string, string>;
}

export interface Metric {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  points: MetricPoint[];
}

export interface HistogramBucket {
  upperBound: number;
  count: number;
}

export interface HistogramData {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export class MetricsRegistry {
  private readonly metrics = new Map<string, Metric>();
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();
  
  constructor(
    private readonly serviceName: string,
    private readonly metricsExporter?: MetricsExporter
  ) {}
  
  incrementCounter(name: string, value = 1, tags: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, tags);
    const currentValue = this.counters.get(key) || 0;
    this.counters.set(key, currentValue + value);
    
    this.addMetricPoint(name, MetricType.COUNTER, currentValue + value, tags);
  }
  
  setGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, value);
    
    this.addMetricPoint(name, MetricType.GAUGE, value, tags);
  }
  
  recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    
    this.addMetricPoint(name, MetricType.HISTOGRAM, value, tags);
  }
  
  timing(name: string, startTime: Date, tags: Record<string, string> = {}): void {
    const duration = Date.now() - startTime.getTime();
    this.recordHistogram(`${name}_duration_ms`, duration, tags);
  }
  
  private addMetricPoint(
    name: string,
    type: MetricType,
    value: number,
    tags: Record<string, string>
  ): void {
    let metric = this.metrics.get(name);
    
    if (!metric) {
      metric = {
        name,
        type,
        description: `${type} metric for ${name}`,
        points: []
      };
      this.metrics.set(name, metric);
    }
    
    metric.points.push({
      timestamp: new Date(),
      value,
      tags: { service: this.serviceName, ...tags }
    });
    
    // Maintain reasonable memory usage
    if (metric.points.length > 1000) {
      metric.points.splice(0, 500);
    }
  }
  
  private getMetricKey(name: string, tags: Record<string, string>): string {
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    
    return `${name}${tagString ? `{${tagString}}` : ''}`;
  }
  
  getHistogramData(name: string, tags: Record<string, string> = {}): HistogramData | null {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key);
    
    if (!values || values.length === 0) {
      return null;
    }
    
    const buckets = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0];
    const histogramBuckets: HistogramBucket[] = buckets.map(upperBound => ({
      upperBound,
      count: values.filter(v => v <= upperBound * 1000).length // Convert to ms
    }));
    
    return {
      buckets: histogramBuckets,
      sum: values.reduce((a, b) => a + b, 0),
      count: values.length
    };
  }
  
  async exportMetrics(): Promise<void> {
    if (this.metricsExporter) {
      const allMetrics = Array.from(this.metrics.values());
      await this.metricsExporter.export(allMetrics);
    }
  }
  
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }
  
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

export interface MetricsExporter {
  export(metrics: Metric[]): Promise<void>;
}

// ================== STRUCTURED LOGGING ==================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  service: string;
  version: string;
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  component: string;
  operation?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata: Record<string, any>;
}

export class StructuredLogger {
  constructor(
    private readonly serviceName: string,
    private readonly serviceVersion: string,
    private readonly component: string,
    private readonly minLevel: LogLevel = LogLevel.INFO,
    private readonly logExporter?: LogExporter
  ) {}
  
  debug(message: string, context?: Record<string, any>, traceContext?: TraceContext): void {
    this.log(LogLevel.DEBUG, message, context, traceContext);
  }
  
  info(message: string, context?: Record<string, any>, traceContext?: TraceContext): void {
    this.log(LogLevel.INFO, message, context, traceContext);
  }
  
  warn(message: string, context?: Record<string, any>, traceContext?: TraceContext): void {
    this.log(LogLevel.WARN, message, context, traceContext);
  }
  
  error(
    message: string,
    error?: Error,
    context?: Record<string, any>,
    traceContext?: TraceContext
  ): void {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : {};
    
    this.log(LogLevel.ERROR, message, { ...context, ...errorContext }, traceContext);
  }
  
  fatal(
    message: string,
    error?: Error,
    context?: Record<string, any>,
    traceContext?: TraceContext
  ): void {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : {};
    
    this.log(LogLevel.FATAL, message, { ...context, ...errorContext }, traceContext);
  }
  
  withOperation(operation: string): OperationLogger {
    return new OperationLogger(this, operation);
  }
  
  withTrace(traceContext: TraceContext): TracedLogger {
    return new TracedLogger(this, traceContext);
  }
  
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    traceContext?: TraceContext
  ): void {
    if (level < this.minLevel) {
      return;
    }
    
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      service: this.serviceName,
      version: this.serviceVersion,
      component: this.component,
      traceId: traceContext?.traceId,
      spanId: traceContext?.spanId,
      correlationId: traceContext?.correlationId,
      metadata: context || {}
    };
    
    // Console output for development
    const levelName = LogLevel[level];
    const logLine = JSON.stringify({
      ...logEntry,
      level: levelName,
      '@timestamp': logEntry.timestamp.toISOString()
    });
    
    console.log(logLine);
    
    // Export to external system if configured
    if (this.logExporter) {
      this.logExporter.export([logEntry]).catch(error => {
        console.error('Failed to export log entry:', error);
      });
    }
  }
}

export class OperationLogger {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly operation: string
  ) {}
  
  debug(message: string, context?: Record<string, any>, traceContext?: TraceContext): void {
    this.logger.debug(message, { ...context, operation: this.operation }, traceContext);
  }
  
  info(message: string, context?: Record<string, any>, traceContext?: TraceContext): void {
    this.logger.info(message, { ...context, operation: this.operation }, traceContext);
  }
  
  warn(message: string, context?: Record<string, any>, traceContext?: TraceContext): void {
    this.logger.warn(message, { ...context, operation: this.operation }, traceContext);
  }
  
  error(
    message: string,
    error?: Error,
    context?: Record<string, any>,
    traceContext?: TraceContext
  ): void {
    this.logger.error(message, error, { ...context, operation: this.operation }, traceContext);
  }
}

export class TracedLogger {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly traceContext: TraceContext
  ) {}
  
  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, context, this.traceContext);
  }
  
  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, context, this.traceContext);
  }
  
  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, context, this.traceContext);
  }
  
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.logger.error(message, error, context, this.traceContext);
  }
}

export interface LogExporter {
  export(logs: LogEntry[]): Promise<void>;
}

// ================== HEALTH MONITORING ==================

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckResult>;
  interval?: number;
  timeout?: number;
  critical?: boolean;
}

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  duration: number;
  metadata?: Record<string, any>;
}

export interface ServiceHealth {
  service: string;
  version: string;
  status: HealthStatus;
  timestamp: Date;
  checks: Record<string, HealthCheckResult>;
  uptime: number;
}

export class HealthMonitor {
  private readonly healthChecks = new Map<string, HealthCheck>();
  private readonly lastResults = new Map<string, HealthCheckResult>();
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private readonly startTime = new Date();
  
  constructor(
    private readonly serviceName: string,
    private readonly serviceVersion: string,
    private readonly logger: StructuredLogger
  ) {}
  
  registerHealthCheck(healthCheck: HealthCheck): void {
    this.healthChecks.set(healthCheck.name, healthCheck);
    
    // Schedule periodic health checks
    if (healthCheck.interval) {
      const interval = setInterval(async () => {
        try {
          await this.runHealthCheck(healthCheck.name);
        } catch (error) {
          this.logger.error('Health check failed', error as Error, {
            healthCheck: healthCheck.name
          });
        }
      }, healthCheck.interval);
      
      this.intervals.set(healthCheck.name, interval);
    }
    
    this.logger.info('Health check registered', {
      healthCheck: healthCheck.name,
      interval: healthCheck.interval,
      critical: healthCheck.critical
    });
  }
  
  async runHealthCheck(name: string): Promise<HealthCheckResult> {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      throw new Error(`Health check ${name} not found`);
    }
    
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Health check ${name} timed out`));
        }, healthCheck.timeout || 5000);
      });
      
      const result = await Promise.race([
        healthCheck.check(),
        timeoutPromise
      ]);
      
      result.duration = Date.now() - startTime;
      this.lastResults.set(name, result);
      
      if (result.status !== HealthStatus.HEALTHY) {
        this.logger.warn('Health check returned non-healthy status', {
          healthCheck: name,
          status: result.status,
          message: result.message,
          duration: result.duration
        });
      }
      
      return result;
      
    } catch (error) {
      const result: HealthCheckResult = {
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
      
      this.lastResults.set(name, result);
      
      this.logger.error('Health check failed', error as Error, {
        healthCheck: name,
        duration: result.duration
      });
      
      return result;
    }
  }
  
  async getServiceHealth(): Promise<ServiceHealth> {
    const checks: Record<string, HealthCheckResult> = {};
    let overallStatus = HealthStatus.HEALTHY;
    
    // Run all health checks
    const checkPromises = Array.from(this.healthChecks.keys()).map(async name => {
      try {
        const result = await this.runHealthCheck(name);
        checks[name] = result;
        
        // Determine overall status
        const healthCheck = this.healthChecks.get(name)!;
        if (healthCheck.critical && result.status === HealthStatus.UNHEALTHY) {
          overallStatus = HealthStatus.UNHEALTHY;
        } else if (result.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
          overallStatus = HealthStatus.DEGRADED;
        }
      } catch (error) {
        checks[name] = {
          status: HealthStatus.UNHEALTHY,
          message: error instanceof Error ? error.message : String(error),
          duration: 0
        };
        
        const healthCheck = this.healthChecks.get(name);
        if (healthCheck?.critical) {
          overallStatus = HealthStatus.UNHEALTHY;
        }
      }
    });
    
    await Promise.all(checkPromises);
    
    return {
      service: this.serviceName,
      version: this.serviceVersion,
      status: overallStatus,
      timestamp: new Date(),
      checks,
      uptime: Date.now() - this.startTime.getTime()
    };
  }
  
  destroy(): void {
    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}

// ================== OBSERVABILITY FACADE ==================

export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion: string;
  tracing: {
    enabled: boolean;
    exporter?: TraceExporter;
  };
  metrics: {
    enabled: boolean;
    exporter?: MetricsExporter;
  };
  logging: {
    level: LogLevel;
    exporter?: LogExporter;
  };
  healthChecks: HealthCheck[];
}

export class ObservabilityService {
  public readonly tracing: TracingService;
  public readonly metrics: MetricsRegistry;
  public readonly logger: StructuredLogger;
  public readonly health: HealthMonitor;
  
  constructor(config: ObservabilityConfig) {
    this.tracing = new TracingService(
      config.serviceName,
      config.serviceVersion,
      config.tracing.exporter
    );
    
    this.metrics = new MetricsRegistry(
      config.serviceName,
      config.metrics.exporter
    );
    
    this.logger = new StructuredLogger(
      config.serviceName,
      config.serviceVersion,
      'observability',
      config.logging.level,
      config.logging.exporter
    );
    
    this.health = new HealthMonitor(
      config.serviceName,
      config.serviceVersion,
      this.logger
    );
    
    // Register provided health checks
    config.healthChecks.forEach(check => {
      this.health.registerHealthCheck(check);
    });
  }
  
  createInstrumentedFunction<T extends (...args: any[]) => Promise<any>>(
    operation: string,
    component: string,
    fn: T
  ): T {
    return (async (...args: any[]) => {
      const traceContext = this.tracing.startSpan(operation, component);
      const startTime = new Date();
      const operationLogger = this.logger.withOperation(operation);
      
      try {
        operationLogger.info('Operation started', { args: args.length });
        
        const result = await fn(...args);
        
        this.tracing.addTag(traceContext, 'success', true);
        this.metrics.incrementCounter(`${operation}_success_total`, 1, { component });
        this.metrics.timing(`${operation}_duration`, startTime, { component, status: 'success' });
        
        operationLogger.info('Operation completed successfully');
        
        return result;
        
      } catch (error) {
        this.tracing.setError(traceContext, error as Error);
        this.metrics.incrementCounter(`${operation}_error_total`, 1, { component });
        this.metrics.timing(`${operation}_duration`, startTime, { component, status: 'error' });
        
        operationLogger.error('Operation failed', error as Error);
        
        throw error;
        
      } finally {
        this.tracing.finishSpan(traceContext);
      }
    }) as T;
  }
  
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down observability service');
    
    try {
      await this.metrics.exportMetrics();
      this.health.destroy();
      this.logger.info('Observability service shutdown complete');
    } catch (error) {
      this.logger.error('Error during observability service shutdown', error as Error);
    }
  }
}