/**
 * Distributed Tracing - Advanced request flow tracking
 * OpenTelemetry-compatible distributed tracing with context propagation
 */

import { observability, TraceContext, SpanStatus } from './ObservabilityCore';
import { logger } from './Logger';

export interface TraceConfig {
  serviceName: string;
  maxSpansPerTrace: number;
  spanExportTimeout: number;
  contextPropagationHeaders: string[];
  samplingStrategy: SamplingStrategy;
  enableAutomaticInstrumentation: boolean;
}

export interface SamplingStrategy {
  type: 'probabilistic' | 'rate_limiting' | 'adaptive';
  rate: number;
  rules: SamplingRule[];
}

export interface SamplingRule {
  operation: string;
  service?: string;
  tag?: string;
  rate: number;
}

export interface TraceMetadata {
  httpMethod?: string;
  httpUrl?: string;
  httpStatusCode?: number;
  dbOperation?: string;
  dbTable?: string;
  cacheOperation?: string;
  cacheKey?: string;
  errorType?: string;
  customTags?: Record<string, string>;
}

export interface SpanExporter {
  export(spans: TraceSpan[]): Promise<void>;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: SpanStatus;
  tags: Record<string, any>;
  logs: SpanLog[];
  references: SpanReference[];
  process: ProcessInfo;
}

export interface SpanLog {
  timestamp: number;
  fields: Record<string, any>;
}

export interface SpanReference {
  type: 'child_of' | 'follows_from';
  traceId: string;
  spanId: string;
}

export interface ProcessInfo {
  serviceName: string;
  serviceVersion: string;
  hostname: string;
  processId: string;
  environment: string;
}

export class DistributedTracing {
  private config: TraceConfig;
  private activeTraces = new Map<string, Map<string, TraceSpan>>();
  private exporters: SpanExporter[] = [];
  private processInfo: ProcessInfo;

  constructor(config: Partial<TraceConfig> = {}) {
    this.config = {
      serviceName: 'vsr-landing',
      maxSpansPerTrace: 1000,
      spanExportTimeout: 30000,
      contextPropagationHeaders: [
        'x-trace-id',
        'x-span-id',
        'x-correlation-id',
        'traceparent',
        'tracestate'
      ],
      samplingStrategy: {
        type: 'probabilistic',
        rate: 1.0,
        rules: []
      },
      enableAutomaticInstrumentation: true,
      ...config
    };

    this.processInfo = {
      serviceName: this.config.serviceName,
      serviceVersion: process.env.npm_package_version || '1.0.0',
      hostname: process.env.HOSTNAME || 'localhost',
      processId: process.pid.toString(),
      environment: process.env.NODE_ENV || 'development'
    };

    this.initializeTracing();
  }

  // Core tracing methods
  startTrace(operationName: string, metadata: TraceMetadata = {}): TraceContext {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    const correlationId = this.generateCorrelationId();

    if (!this.shouldSample(operationName, metadata)) {
      return this.createNoopContext(operationName, traceId, spanId, correlationId);
    }

    const context: TraceContext = {
      traceId,
      spanId,
      correlationId,
      operationName,
      startTime: Date.now(),
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.processInfo.serviceVersion,
        'service.environment': this.processInfo.environment,
        ...this.metadataToAttributes(metadata)
      },
      baggage: {}
    };

    const span = this.createSpan(context);
    this.addSpanToTrace(traceId, span);

    logger.withCorrelation(context).debug(`Started trace: ${operationName}`, {
      traceId,
      spanId,
      operation: operationName
    });

    return context;
  }

  startChildSpan(operationName: string, parentContext: TraceContext, metadata: TraceMetadata = {}): TraceContext {
    if (!this.shouldSample(operationName, metadata)) {
      return this.createNoopContext(operationName, parentContext.traceId, this.generateSpanId(), parentContext.correlationId);
    }

    const spanId = this.generateSpanId();
    const context: TraceContext = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      correlationId: parentContext.correlationId,
      userId: parentContext.userId,
      sessionId: parentContext.sessionId,
      operationName,
      startTime: Date.now(),
      attributes: {
        ...parentContext.attributes,
        ...this.metadataToAttributes(metadata)
      },
      baggage: { ...parentContext.baggage }
    };

    const span = this.createSpan(context);
    this.addSpanToTrace(context.traceId, span);

    logger.withCorrelation(context).debug(`Started child span: ${operationName}`, {
      traceId: context.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      operation: operationName
    });

    return context;
  }

  finishSpan(context: TraceContext, status: SpanStatus = SpanStatus.OK, error?: Error): void {
    const span = this.getSpan(context.traceId, context.spanId);
    if (!span) return;

    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = status;

    if (error) {
      span.status = SpanStatus.ERROR;
      span.tags['error'] = true;
      span.tags['error.type'] = error.constructor.name;
      span.tags['error.message'] = error.message;
      if (error.stack) {
        span.tags['error.stack'] = error.stack;
      }

      this.addSpanLog(context, 'error', {
        event: 'error',
        'error.object': error.message,
        'error.kind': error.constructor.name,
        level: 'error'
      });
    }

    logger.withCorrelation(context).debug(`Finished span: ${context.operationName}`, {
      traceId: context.traceId,
      spanId: context.spanId,
      duration: span.duration,
      status
    });

    // Export span if trace is complete or span limit reached
    this.maybeExportTrace(context.traceId);
  }

  addSpanTag(context: TraceContext, key: string, value: any): void {
    const span = this.getSpan(context.traceId, context.spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  addSpanLog(context: TraceContext, event: string, fields: Record<string, any> = {}): void {
    const span = this.getSpan(context.traceId, context.spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        fields: {
          event,
          ...fields
        }
      });
    }
  }

  setBaggage(context: TraceContext, key: string, value: string): TraceContext {
    return {
      ...context,
      baggage: {
        ...context.baggage,
        [key]: value
      }
    };
  }

  getBaggage(context: TraceContext, key: string): string | undefined {
    return context.baggage[key];
  }

  // Context propagation
  injectHeaders(context: TraceContext, headers: Record<string, string> = {}): Record<string, string> {
    const injectedHeaders = { ...headers };

    // W3C Trace Context format
    injectedHeaders['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
    
    if (Object.keys(context.baggage).length > 0) {
      injectedHeaders['tracestate'] = Object.entries(context.baggage)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    }

    // Custom headers
    injectedHeaders['x-trace-id'] = context.traceId;
    injectedHeaders['x-span-id'] = context.spanId;
    injectedHeaders['x-correlation-id'] = context.correlationId;

    return injectedHeaders;
  }

  extractContext(headers: Record<string, string>): TraceContext | null {
    // Try W3C Trace Context first
    const traceparent = headers['traceparent'];
    if (traceparent) {
      const parts = traceparent.split('-');
      if (parts.length === 4) {
        const [version, traceId, spanId, flags] = parts;
        if (version === '00' && traceId.length === 32 && spanId.length === 16) {
          let baggage: Record<string, string> = {};
          
          const tracestate = headers['tracestate'];
          if (tracestate) {
            baggage = Object.fromEntries(
              tracestate.split(',').map(pair => {
                const [key, value] = pair.split('=');
                return [key, value];
              })
            );
          }

          return {
            traceId,
            spanId,
            correlationId: headers['x-correlation-id'] || this.generateCorrelationId(),
            operationName: 'extracted',
            startTime: Date.now(),
            attributes: {},
            baggage
          };
        }
      }
    }

    // Fallback to custom headers
    const traceId = headers['x-trace-id'];
    const spanId = headers['x-span-id'];
    const correlationId = headers['x-correlation-id'];

    if (traceId && spanId) {
      return {
        traceId,
        spanId,
        correlationId: correlationId || this.generateCorrelationId(),
        operationName: 'extracted',
        startTime: Date.now(),
        attributes: {},
        baggage: {}
      };
    }

    return null;
  }

  // Instrumentation helpers
  async traceAsync<T>(
    operationName: string,
    operation: (context: TraceContext) => Promise<T>,
    parentContext?: TraceContext,
    metadata: TraceMetadata = {}
  ): Promise<T> {
    const context = parentContext 
      ? this.startChildSpan(operationName, parentContext, metadata)
      : this.startTrace(operationName, metadata);

    const startTime = Date.now();

    try {
      const result = await operation(context);
      const duration = Date.now() - startTime;

      this.addSpanTag(context, 'duration_ms', duration);
      this.addSpanLog(context, 'operation.completed', { 
        success: true,
        duration_ms: duration 
      });

      this.finishSpan(context, SpanStatus.OK);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.addSpanTag(context, 'duration_ms', duration);
      this.addSpanLog(context, 'operation.failed', { 
        success: false,
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error)
      });

      this.finishSpan(context, SpanStatus.ERROR, error as Error);
      throw error;
    }
  }

  traceSync<T>(
    operationName: string,
    operation: (context: TraceContext) => T,
    parentContext?: TraceContext,
    metadata: TraceMetadata = {}
  ): T {
    const context = parentContext 
      ? this.startChildSpan(operationName, parentContext, metadata)
      : this.startTrace(operationName, metadata);

    const startTime = Date.now();

    try {
      const result = operation(context);
      const duration = Date.now() - startTime;

      this.addSpanTag(context, 'duration_ms', duration);
      this.finishSpan(context, SpanStatus.OK);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addSpanTag(context, 'duration_ms', duration);
      this.finishSpan(context, SpanStatus.ERROR, error as Error);
      throw error;
    }
  }

  // HTTP instrumentation
  instrumentHttpRequest(context: TraceContext, method: string, url: string): void {
    this.addSpanTag(context, 'http.method', method);
    this.addSpanTag(context, 'http.url', url);
    this.addSpanTag(context, 'component', 'http-client');
  }

  instrumentHttpResponse(context: TraceContext, statusCode: number, responseSize?: number): void {
    this.addSpanTag(context, 'http.status_code', statusCode);
    if (responseSize !== undefined) {
      this.addSpanTag(context, 'http.response_size', responseSize);
    }
    
    if (statusCode >= 400) {
      this.addSpanLog(context, 'http.error', {
        'http.status_code': statusCode,
        level: 'error'
      });
    }
  }

  // Database instrumentation
  instrumentDatabase(context: TraceContext, operation: string, table: string, query?: string): void {
    this.addSpanTag(context, 'db.operation', operation);
    this.addSpanTag(context, 'db.table', table);
    this.addSpanTag(context, 'component', 'database');
    
    if (query) {
      this.addSpanTag(context, 'db.statement', query);
    }
  }

  // Cache instrumentation  
  instrumentCache(context: TraceContext, operation: string, key: string, hit?: boolean): void {
    this.addSpanTag(context, 'cache.operation', operation);
    this.addSpanTag(context, 'cache.key', key);
    this.addSpanTag(context, 'component', 'cache');
    
    if (hit !== undefined) {
      this.addSpanTag(context, 'cache.hit', hit);
    }
  }

  // Span management
  addExporter(exporter: SpanExporter): void {
    this.exporters.push(exporter);
  }

  removeExporter(exporter: SpanExporter): void {
    const index = this.exporters.indexOf(exporter);
    if (index > -1) {
      this.exporters.splice(index, 1);
    }
  }

  // Private methods
  private createSpan(context: TraceContext): TraceSpan {
    return {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      operationName: context.operationName,
      startTime: context.startTime,
      status: SpanStatus.OK,
      tags: { ...context.attributes },
      logs: [],
      references: context.parentSpanId ? [{
        type: 'child_of',
        traceId: context.traceId,
        spanId: context.parentSpanId
      }] : [],
      process: { ...this.processInfo }
    };
  }

  private addSpanToTrace(traceId: string, span: TraceSpan): void {
    if (!this.activeTraces.has(traceId)) {
      this.activeTraces.set(traceId, new Map());
    }
    
    const spans = this.activeTraces.get(traceId)!;
    spans.set(span.spanId, span);

    // Prevent memory leaks
    if (spans.size > this.config.maxSpansPerTrace) {
      logger.warn(`Trace ${traceId} exceeded max spans limit`, {
        traceId,
        spanCount: spans.size,
        maxSpans: this.config.maxSpansPerTrace
      });
    }
  }

  private getSpan(traceId: string, spanId: string): TraceSpan | undefined {
    return this.activeTraces.get(traceId)?.get(spanId);
  }

  private maybeExportTrace(traceId: string): void {
    const spans = this.activeTraces.get(traceId);
    if (!spans) return;

    // Check if all spans in trace are finished
    const allFinished = Array.from(spans.values()).every(span => span.endTime !== undefined);
    
    if (allFinished || spans.size >= this.config.maxSpansPerTrace) {
      this.exportTrace(traceId);
    }
  }

  private async exportTrace(traceId: string): Promise<void> {
    const spans = this.activeTraces.get(traceId);
    if (!spans) return;

    const spansArray = Array.from(spans.values());
    
    try {
      await Promise.all(
        this.exporters.map(exporter => 
          Promise.race([
            exporter.export(spansArray),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Export timeout')), this.config.spanExportTimeout)
            )
          ])
        )
      );

      logger.debug(`Exported trace with ${spansArray.length} spans`, {
        traceId,
        spanCount: spansArray.length
      });
    } catch (error) {
      logger.error('Failed to export trace', error as Error, {
        traceId,
        spanCount: spansArray.length
      });
    } finally {
      this.activeTraces.delete(traceId);
    }
  }

  private shouldSample(operationName: string, metadata: TraceMetadata): boolean {
    // Check specific rules first
    for (const rule of this.config.samplingStrategy.rules) {
      if (rule.operation === operationName) {
        return Math.random() < rule.rate;
      }
    }

    // Use default sampling strategy
    switch (this.config.samplingStrategy.type) {
      case 'probabilistic':
        return Math.random() < this.config.samplingStrategy.rate;
      case 'rate_limiting':
        // Simple rate limiting implementation
        return Math.random() < this.config.samplingStrategy.rate;
      case 'adaptive':
        // Adaptive sampling based on error rates, etc.
        return Math.random() < this.config.samplingStrategy.rate;
      default:
        return true;
    }
  }

  private metadataToAttributes(metadata: TraceMetadata): Record<string, any> {
    const attributes: Record<string, any> = {};

    if (metadata.httpMethod) attributes['http.method'] = metadata.httpMethod;
    if (metadata.httpUrl) attributes['http.url'] = metadata.httpUrl;
    if (metadata.httpStatusCode) attributes['http.status_code'] = metadata.httpStatusCode;
    if (metadata.dbOperation) attributes['db.operation'] = metadata.dbOperation;
    if (metadata.dbTable) attributes['db.table'] = metadata.dbTable;
    if (metadata.cacheOperation) attributes['cache.operation'] = metadata.cacheOperation;
    if (metadata.cacheKey) attributes['cache.key'] = metadata.cacheKey;
    if (metadata.errorType) attributes['error.type'] = metadata.errorType;
    if (metadata.customTags) Object.assign(attributes, metadata.customTags);

    return attributes;
  }

  private generateTraceId(): string {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private generateSpanId(): string {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private generateCorrelationId(): string {
    return `${this.config.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createNoopContext(operationName: string, traceId: string, spanId: string, correlationId: string): TraceContext {
    return {
      traceId,
      spanId,
      correlationId,
      operationName,
      startTime: Date.now(),
      attributes: {},
      baggage: {}
    };
  }

  private initializeTracing(): void {
    logger.info('Distributed tracing initialized', {
      serviceName: this.config.serviceName,
      samplingRate: this.config.samplingStrategy.rate,
      maxSpansPerTrace: this.config.maxSpansPerTrace
    });

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupStaleTraces();
    }, 60000); // Every minute
  }

  private cleanupStaleTraces(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [traceId, spans] of this.activeTraces.entries()) {
      const oldestSpan = Array.from(spans.values())
        .reduce((oldest, span) => span.startTime < oldest.startTime ? span : oldest);

      if (now - oldestSpan.startTime > staleThreshold) {
        logger.warn(`Cleaning up stale trace: ${traceId}`, {
          traceId,
          spanCount: spans.size,
          ageMs: now - oldestSpan.startTime
        });
        
        this.exportTrace(traceId);
      }
    }
  }
}

// Console exporter for development
export class ConsoleSpanExporter implements SpanExporter {
  async export(spans: TraceSpan[]): Promise<void> {
    for (const span of spans) {
      console.log(`[TRACE] ${span.operationName}`, {
        traceId: span.traceId.substring(0, 8),
        spanId: span.spanId.substring(0, 8),
        parentSpanId: span.parentSpanId?.substring(0, 8),
        duration: span.duration,
        status: span.status,
        tags: span.tags,
        logs: span.logs
      });
    }
  }
}

// HTTP exporter for external tracing systems
export class HttpSpanExporter implements SpanExporter {
  constructor(
    private endpoint: string,
    private headers: Record<string, string> = {},
    private timeout: number = 10000
  ) {}

  async export(spans: TraceSpan[]): Promise<void> {
    const payload = {
      spans: spans.map(span => ({
        traceID: span.traceId,
        spanID: span.spanId,
        parentSpanID: span.parentSpanId,
        operationName: span.operationName,
        startTime: span.startTime * 1000, // microseconds
        duration: (span.duration || 0) * 1000, // microseconds
        tags: Object.entries(span.tags).map(([key, value]) => ({
          key,
          value: String(value)
        })),
        logs: span.logs.map(log => ({
          timestamp: log.timestamp * 1000,
          fields: Object.entries(log.fields).map(([key, value]) => ({
            key,
            value: String(value)
          }))
        })),
        process: {
          serviceName: span.process.serviceName,
          tags: [
            { key: 'service.version', value: span.process.serviceVersion },
            { key: 'hostname', value: span.process.hostname },
            { key: 'process.pid', value: span.process.processId },
            { key: 'environment', value: span.process.environment }
          ]
        }
      }))
    };

    // HTTP export implementation would go here
    // For now, just log that it would be exported
    console.log(`[HTTP EXPORT] Exporting ${spans.length} spans to ${this.endpoint}`);
  }
}

// Global instance
export const distributedTracing = new DistributedTracing();

// Add console exporter in development
if (process.env.NODE_ENV === 'development') {
  distributedTracing.addExporter(new ConsoleSpanExporter());
}