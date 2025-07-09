/**
 * Observability Core - Comprehensive monitoring infrastructure
 * Unified system for metrics, tracing, and logging with correlation
 */

export interface ObservabilityConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  sampling: {
    tracesSampleRate: number;
    errorsSampleRate: number;
    metricsSampleRate: number;
  };
  exports: {
    console: boolean;
    http: boolean;
    file: boolean;
    otlp: boolean;
  };
  endpoints: {
    metricsEndpoint?: string;
    tracesEndpoint?: string;
    logsEndpoint?: string;
  };
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  userId?: string;
  sessionId?: string;
  operationName: string;
  startTime: number;
  attributes: Record<string, any>;
  baggage: Record<string, string>;
}

export interface MetricPoint {
  name: string;
  value: number;
  type: MetricType;
  timestamp: number;
  tags: Record<string, string>;
  unit?: string;
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  traceContext?: TraceContext;
  attributes: Record<string, any>;
  error?: Error;
  duration?: number;
  component: string;
  operation: string;
}

export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: SpanStatus;
  attributes: Record<string, any>;
  events: SpanEvent[];
  links: SpanLink[];
}

export enum SpanStatus {
  OK = 'ok',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

export interface SpanEvent {
  timestamp: number;
  name: string;
  attributes: Record<string, any>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Record<string, any>;
}

export class ObservabilityCore {
  private config: ObservabilityConfig;
  private activeSpans = new Map<string, Span>();
  private metrics = new Map<string, MetricPoint[]>();
  private correlationIdGenerator: () => string;
  private startTime = Date.now();

  constructor(config: Partial<ObservabilityConfig> = {}) {
    this.config = {
      enableMetrics: true,
      enableTracing: true,
      enableLogging: true,
      serviceName: 'vsr-landing',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      sampling: {
        tracesSampleRate: 1.0,
        errorsSampleRate: 1.0,
        metricsSampleRate: 1.0
      },
      exports: {
        console: true,
        http: false,
        file: false,
        otlp: false
      },
      endpoints: {},
      ...config
    };

    this.correlationIdGenerator = this.createCorrelationIdGenerator();
    this.initializeObservability();
  }

  // Tracing Methods
  startSpan(operationName: string, parentContext?: TraceContext): TraceContext {
    if (!this.config.enableTracing || !this.shouldSample('traces')) {
      return this.createNoopContext(operationName);
    }

    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const correlationId = parentContext?.correlationId || this.correlationIdGenerator();

    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      correlationId,
      userId: parentContext?.userId,
      sessionId: parentContext?.sessionId,
      operationName,
      startTime: Date.now(),
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        'service.environment': this.config.environment,
        ...parentContext?.attributes
      },
      baggage: { ...parentContext?.baggage }
    };

    const span: Span = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      operationName,
      startTime: context.startTime,
      status: SpanStatus.OK,
      attributes: context.attributes,
      events: [],
      links: []
    };

    this.activeSpans.set(spanId, span);
    return context;
  }

  finishSpan(context: TraceContext, status: SpanStatus = SpanStatus.OK, error?: Error): void {
    if (!this.config.enableTracing) return;

    const span = this.activeSpans.get(context.spanId);
    if (!span) return;

    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = status;

    if (error) {
      span.attributes['error'] = true;
      span.attributes['error.message'] = error.message;
      span.attributes['error.stack'] = error.stack;
      this.addSpanEvent(context, 'error', {
        'error.type': error.constructor.name,
        'error.message': error.message
      });
    }

    this.exportSpan(span);
    this.activeSpans.delete(context.spanId);
  }

  addSpanEvent(context: TraceContext, name: string, attributes: Record<string, any> = {}): void {
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.events.push({
        timestamp: Date.now(),
        name,
        attributes
      });
    }
  }

  setSpanAttribute(context: TraceContext, key: string, value: any): void {
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.attributes[key] = value;
    }
  }

  // Metrics Methods
  recordCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    if (!this.config.enableMetrics || !this.shouldSample('metrics')) return;

    this.recordMetric({
      name,
      value,
      type: MetricType.COUNTER,
      timestamp: Date.now(),
      tags: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...tags
      }
    });
  }

  recordGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.config.enableMetrics || !this.shouldSample('metrics')) return;

    this.recordMetric({
      name,
      value,
      type: MetricType.GAUGE,
      timestamp: Date.now(),
      tags: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...tags
      }
    });
  }

  recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.config.enableMetrics || !this.shouldSample('metrics')) return;

    this.recordMetric({
      name,
      value,
      type: MetricType.HISTOGRAM,
      timestamp: Date.now(),
      tags: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...tags
      }
    });
  }

  // Logging Methods
  log(level: LogLevel, message: string, attributes: Record<string, any> = {}, context?: TraceContext): void {
    if (!this.config.enableLogging) return;

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      traceContext: context,
      attributes: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...attributes
      },
      component: attributes.component || 'unknown',
      operation: attributes.operation || context?.operationName || 'unknown'
    };

    if (attributes.error instanceof Error) {
      logEntry.error = attributes.error;
    }

    if (attributes.duration) {
      logEntry.duration = attributes.duration;
    }

    this.exportLog(logEntry);
  }

  trace(message: string, attributes?: Record<string, any>, context?: TraceContext): void {
    this.log(LogLevel.TRACE, message, attributes, context);
  }

  debug(message: string, attributes?: Record<string, any>, context?: TraceContext): void {
    this.log(LogLevel.DEBUG, message, attributes, context);
  }

  info(message: string, attributes?: Record<string, any>, context?: TraceContext): void {
    this.log(LogLevel.INFO, message, attributes, context);
  }

  warn(message: string, attributes?: Record<string, any>, context?: TraceContext): void {
    this.log(LogLevel.WARN, message, attributes, context);
  }

  error(message: string, error?: Error, attributes?: Record<string, any>, context?: TraceContext): void {
    this.log(LogLevel.ERROR, message, { error, ...attributes }, context);
  }

  fatal(message: string, error?: Error, attributes?: Record<string, any>, context?: TraceContext): void {
    this.log(LogLevel.FATAL, message, { error, ...attributes }, context);
  }

  // Instrumentation helpers
  async instrumentAsync<T>(
    operationName: string,
    operation: (context: TraceContext) => Promise<T>,
    parentContext?: TraceContext,
    attributes?: Record<string, any>
  ): Promise<T> {
    const context = this.startSpan(operationName, parentContext);
    
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        this.setSpanAttribute(context, key, value);
      });
    }

    const startTime = Date.now();
    
    try {
      this.debug(`Starting operation: ${operationName}`, { operationName }, context);
      const result = await operation(context);
      
      const duration = Date.now() - startTime;
      this.recordHistogram('operation.duration', duration, { operation: operationName });
      this.recordCounter('operation.success', 1, { operation: operationName });
      
      this.debug(`Completed operation: ${operationName}`, { 
        operationName, 
        duration,
        success: true
      }, context);
      
      this.finishSpan(context, SpanStatus.OK);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordHistogram('operation.duration', duration, { 
        operation: operationName,
        status: 'error'
      });
      this.recordCounter('operation.error', 1, { 
        operation: operationName,
        error_type: error instanceof Error ? error.constructor.name : 'unknown'
      });
      
      this.error(`Operation failed: ${operationName}`, error as Error, { 
        operationName,
        duration,
        success: false
      }, context);
      
      this.finishSpan(context, SpanStatus.ERROR, error as Error);
      throw error;
    }
  }

  instrumentSync<T>(
    operationName: string,
    operation: (context: TraceContext) => T,
    parentContext?: TraceContext,
    attributes?: Record<string, any>
  ): T {
    const context = this.startSpan(operationName, parentContext);
    
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        this.setSpanAttribute(context, key, value);
      });
    }

    const startTime = Date.now();
    
    try {
      const result = operation(context);
      const duration = Date.now() - startTime;
      
      this.recordHistogram('operation.duration', duration, { operation: operationName });
      this.recordCounter('operation.success', 1, { operation: operationName });
      
      this.finishSpan(context, SpanStatus.OK);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordHistogram('operation.duration', duration, { 
        operation: operationName,
        status: 'error'
      });
      this.recordCounter('operation.error', 1, { operation: operationName });
      
      this.finishSpan(context, SpanStatus.ERROR, error as Error);
      throw error;
    }
  }

  // Health and Status
  getHealthStatus(): ObservabilityHealth {
    const uptime = Date.now() - this.startTime;
    const activeSpansCount = this.activeSpans.size;
    const metricsCount = Array.from(this.metrics.values()).reduce((sum, points) => sum + points.length, 0);

    return {
      status: 'healthy',
      uptime,
      activeSpans: activeSpansCount,
      metricsCollected: metricsCount,
      config: {
        enableMetrics: this.config.enableMetrics,
        enableTracing: this.config.enableTracing,
        enableLogging: this.config.enableLogging,
        serviceName: this.config.serviceName,
        environment: this.config.environment
      },
      sampling: this.config.sampling
    };
  }

  // Private methods
  private recordMetric(metric: MetricPoint): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    this.metrics.get(metric.name)!.push(metric);
    this.exportMetric(metric);
    
    // Cleanup old metrics (keep last 1000 points per metric)
    const points = this.metrics.get(metric.name)!;
    if (points.length > 1000) {
      this.metrics.set(metric.name, points.slice(-1000));
    }
  }

  private exportSpan(span: Span): void {
    if (this.config.exports.console) {
      this.exportSpanToConsole(span);
    }
    
    if (this.config.exports.http && this.config.endpoints.tracesEndpoint) {
      this.exportSpanToHttp(span);
    }
  }

  private exportMetric(metric: MetricPoint): void {
    if (this.config.exports.console) {
      this.exportMetricToConsole(metric);
    }
    
    if (this.config.exports.http && this.config.endpoints.metricsEndpoint) {
      this.exportMetricToHttp(metric);
    }
  }

  private exportLog(log: LogEntry): void {
    if (this.config.exports.console) {
      this.exportLogToConsole(log);
    }
    
    if (this.config.exports.http && this.config.endpoints.logsEndpoint) {
      this.exportLogToHttp(log);
    }
  }

  private exportSpanToConsole(span: Span): void {
    console.log(`[TRACE] ${span.operationName}`, {
      traceId: span.traceId,
      spanId: span.spanId,
      duration: span.duration,
      status: span.status,
      attributes: span.attributes
    });
  }

  private exportMetricToConsole(metric: MetricPoint): void {
    console.log(`[METRIC] ${metric.name}=${metric.value} (${metric.type})`, {
      tags: metric.tags,
      timestamp: new Date(metric.timestamp).toISOString()
    });
  }

  private exportLogToConsole(log: LogEntry): void {
    const prefix = `[${log.level.toUpperCase()}]`;
    const traceInfo = log.traceContext ? 
      `[${log.traceContext.traceId.substring(0, 8)}:${log.traceContext.spanId.substring(0, 8)}]` : '';
    
    console.log(`${prefix} ${traceInfo} ${log.message}`, {
      timestamp: new Date(log.timestamp).toISOString(),
      component: log.component,
      operation: log.operation,
      attributes: log.attributes,
      error: log.error?.message
    });
  }

  private async exportSpanToHttp(span: Span): Promise<void> {
    // Implementation for HTTP export to tracing backend
  }

  private async exportMetricToHttp(metric: MetricPoint): Promise<void> {
    // Implementation for HTTP export to metrics backend
  }

  private async exportLogToHttp(log: LogEntry): Promise<void> {
    // Implementation for HTTP export to logging backend
  }

  private shouldSample(type: 'traces' | 'metrics' | 'errors'): boolean {
    const rate = this.config.sampling[`${type}SampleRate`];
    return Math.random() < rate;
  }

  private generateTraceId(): string {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private generateSpanId(): string {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private createCorrelationIdGenerator(): () => string {
    let counter = 0;
    return () => {
      counter = (counter + 1) % 10000;
      return `${this.config.serviceName}-${Date.now()}-${counter.toString().padStart(4, '0')}`;
    };
  }

  private createNoopContext(operationName: string): TraceContext {
    return {
      traceId: '',
      spanId: '',
      correlationId: '',
      operationName,
      startTime: Date.now(),
      attributes: {},
      baggage: {}
    };
  }

  private initializeObservability(): void {
    // Record startup metrics
    this.recordCounter('service.startup', 1);
    this.recordGauge('service.uptime', 0);
    
    // Set up periodic metrics
    setInterval(() => {
      this.recordGauge('service.uptime', Date.now() - this.startTime);
      this.recordGauge('active_spans', this.activeSpans.size);
    }, 30000); // Every 30 seconds
    
    this.info('Observability system initialized', {
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      environment: this.config.environment,
      enableMetrics: this.config.enableMetrics,
      enableTracing: this.config.enableTracing,
      enableLogging: this.config.enableLogging
    });
  }
}

export interface ObservabilityHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  activeSpans: number;
  metricsCollected: number;
  config: {
    enableMetrics: boolean;
    enableTracing: boolean;
    enableLogging: boolean;
    serviceName: string;
    environment: string;
  };
  sampling: {
    tracesSampleRate: number;
    errorsSampleRate: number;
    metricsSampleRate: number;
  };
}

// Global instance
export const observability = new ObservabilityCore();