/**
 * Structured Logger - Advanced logging with correlation and context
 * Production-ready logging system with structured output and correlation tracking
 */

import { observability, TraceContext, LogLevel } from './ObservabilityCore';

export interface LoggerConfig {
  name: string;
  level: LogLevel;
  enableCorrelation: boolean;
  enableStackTrace: boolean;
  enableMetrics: boolean;
  formatters: LogFormatter[];
  transports: LogTransport[];
  redactionPatterns: RegExp[];
  maxMessageLength: number;
  contextFields: string[];
}

export interface LogFormatter {
  name: string;
  format: (entry: LogEntryInternal) => string;
}

export interface LogTransport {
  name: string;
  level: LogLevel;
  enabled: boolean;
  write: (formatted: string, entry: LogEntryInternal) => Promise<void> | void;
}

export interface LogEntryInternal {
  timestamp: number;
  level: LogLevel;
  logger: string;
  message: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component: string;
  operation: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context: Record<string, any>;
  tags: string[];
  metadata: Record<string, any>;
}

export class Logger {
  private config: LoggerConfig;
  private context: Record<string, any> = {};
  private tags: string[] = [];

  constructor(name: string, config: Partial<LoggerConfig> = {}) {
    this.config = {
      name,
      level: LogLevel.INFO,
      enableCorrelation: true,
      enableStackTrace: true,
      enableMetrics: true,
      formatters: [new JSONFormatter(), new ConsoleFormatter()],
      transports: [new ConsoleTransport()],
      redactionPatterns: [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /authorization/i,
        /credit.?card/i,
        /ssn/i
      ],
      maxMessageLength: 10000,
      contextFields: ['userId', 'sessionId', 'requestId', 'correlationId'],
      ...config
    };
  }

  // Context management
  withContext(context: Record<string, any>): Logger {
    const logger = new Logger(this.config.name, this.config);
    logger.context = { ...this.context, ...context };
    logger.tags = [...this.tags];
    return logger;
  }

  withTags(...tags: string[]): Logger {
    const logger = new Logger(this.config.name, this.config);
    logger.context = { ...this.context };
    logger.tags = [...this.tags, ...tags];
    return logger;
  }

  withCorrelation(traceContext: TraceContext): Logger {
    return this.withContext({
      correlationId: traceContext.correlationId,
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
      userId: traceContext.userId,
      sessionId: traceContext.sessionId
    });
  }

  // Core logging methods
  trace(message: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  debug(message: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata: Record<string, any> = {}): void {
    const errorMeta = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: this.config.enableStackTrace ? error.stack : undefined,
        code: (error as any).code
      }
    } : {};
    
    this.log(LogLevel.ERROR, message, { ...metadata, ...errorMeta });
  }

  fatal(message: string, error?: Error, metadata: Record<string, any> = {}): void {
    const errorMeta = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: this.config.enableStackTrace ? error.stack : undefined,
        code: (error as any).code
      }
    } : {};
    
    this.log(LogLevel.FATAL, message, { ...metadata, ...errorMeta });
  }

  // Specialized logging methods
  http(method: string, url: string, statusCode: number, duration: number, metadata: Record<string, any> = {}): void {
    this.info(`HTTP ${method} ${url} ${statusCode}`, {
      ...metadata,
      http: {
        method,
        url,
        status_code: statusCode,
        duration
      },
      duration,
      component: 'http',
      operation: `${method.toLowerCase()}_${url.replace(/[^a-zA-Z0-9]/g, '_')}`
    });
  }

  database(operation: string, table: string, duration: number, rowsAffected?: number, metadata: Record<string, any> = {}): void {
    this.info(`DB ${operation} ${table}`, {
      ...metadata,
      database: {
        operation,
        table,
        duration,
        rows_affected: rowsAffected
      },
      duration,
      component: 'database',
      operation: `db_${operation}_${table}`
    });
  }

  cache(operation: string, key: string, hit: boolean, duration: number, metadata: Record<string, any> = {}): void {
    this.info(`Cache ${operation} ${key} ${hit ? 'HIT' : 'MISS'}`, {
      ...metadata,
      cache: {
        operation,
        key: this.redactSensitiveData(key),
        hit,
        duration
      },
      duration,
      component: 'cache',
      operation: `cache_${operation}`
    });
  }

  external(service: string, operation: string, duration: number, success: boolean, metadata: Record<string, any> = {}): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, `External ${service} ${operation} ${success ? 'SUCCESS' : 'FAILED'}`, {
      ...metadata,
      external: {
        service,
        operation,
        duration,
        success
      },
      duration,
      component: 'external',
      operation: `external_${service}_${operation}`
    });
  }

  security(event: string, userId?: string, details: Record<string, any> = {}): void {
    this.warn(`Security event: ${event}`, {
      ...details,
      security: {
        event,
        user_id: userId,
        timestamp: Date.now(),
        details: this.redactSensitiveData(details)
      },
      component: 'security',
      operation: `security_${event}`,
      tags: [...this.tags, 'security']
    });
  }

  business(event: string, value?: number, metadata: Record<string, any> = {}): void {
    this.info(`Business event: ${event}`, {
      ...metadata,
      business: {
        event,
        value,
        timestamp: Date.now()
      },
      component: 'business',
      operation: `business_${event}`,
      tags: [...this.tags, 'business']
    });
  }

  performance(operation: string, duration: number, metrics: Record<string, number> = {}): void {
    this.info(`Performance: ${operation}`, {
      performance: {
        operation,
        duration,
        metrics
      },
      duration,
      component: 'performance',
      operation: `perf_${operation}`,
      tags: [...this.tags, 'performance']
    });
  }

  // Timing utilities
  time(operation: string): LogTimer {
    return new LogTimer(this, operation);
  }

  // Main logging implementation
  private log(level: LogLevel, message: string, metadata: Record<string, any> = {}): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Record metrics if enabled
    if (this.config.enableMetrics) {
      observability.recordCounter('log.entries', 1, {
        level: level.toString(),
        logger: this.config.name,
        component: metadata.component || 'unknown'
      });
    }

    const entry: LogEntryInternal = {
      timestamp: Date.now(),
      level,
      logger: this.config.name,
      message: this.truncateMessage(message),
      correlationId: this.context.correlationId,
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      requestId: this.context.requestId,
      component: metadata.component || this.config.name,
      operation: metadata.operation || 'unknown',
      duration: metadata.duration,
      error: metadata.error,
      context: { ...this.context },
      tags: [...this.tags, ...(metadata.tags || [])],
      metadata: this.redactSensitiveData(metadata)
    };

    // Send to observability core
    if (this.config.enableCorrelation && this.context.traceId) {
      const traceContext: TraceContext = {
        traceId: this.context.traceId,
        spanId: this.context.spanId || '',
        correlationId: this.context.correlationId || '',
        operationName: entry.operation,
        startTime: entry.timestamp,
        attributes: entry.context,
        baggage: {}
      };
      
      observability.log(level, message, metadata, traceContext);
    } else {
      observability.log(level, message, metadata);
    }

    // Process through formatters and transports
    this.processLogEntry(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= configLevelIndex;
  }

  private truncateMessage(message: string): string {
    if (message.length <= this.config.maxMessageLength) {
      return message;
    }
    return message.substring(0, this.config.maxMessageLength - 3) + '...';
  }

  private redactSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.redactSensitiveData(item));
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = this.redactSensitiveData(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  private isSensitiveField(fieldName: string): boolean {
    return this.config.redactionPatterns.some(pattern => pattern.test(fieldName));
  }

  private processLogEntry(entry: LogEntryInternal): void {
    for (const formatter of this.config.formatters) {
      const formatted = formatter.format(entry);
      
      for (const transport of this.config.transports) {
        if (transport.enabled && this.shouldTransport(entry.level, transport.level)) {
          try {
            transport.write(formatted, entry);
          } catch (error) {
            console.error(`Failed to write to transport ${transport.name}:`, error);
          }
        }
      }
    }
  }

  private shouldTransport(entryLevel: LogLevel, transportLevel: LogLevel): boolean {
    const levels = [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(entryLevel) >= levels.indexOf(transportLevel);
  }
}

// Timer utility for measuring operation duration
export class LogTimer {
  private startTime: number;
  private operation: string;
  private logger: Logger;

  constructor(logger: Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(metadata: Record<string, any> = {}): number {
    const duration = Date.now() - this.startTime;
    this.logger.performance(this.operation, duration, metadata);
    return duration;
  }
}

// Built-in formatters
export class JSONFormatter implements LogFormatter {
  name = 'json';

  format(entry: LogEntryInternal): string {
    return JSON.stringify({
      '@timestamp': new Date(entry.timestamp).toISOString(),
      level: entry.level,
      logger: entry.logger,
      message: entry.message,
      correlation_id: entry.correlationId,
      trace_id: entry.traceId,
      span_id: entry.spanId,
      user_id: entry.userId,
      session_id: entry.sessionId,
      request_id: entry.requestId,
      component: entry.component,
      operation: entry.operation,
      duration: entry.duration,
      error: entry.error,
      context: entry.context,
      tags: entry.tags,
      metadata: entry.metadata
    });
  }
}

export class ConsoleFormatter implements LogFormatter {
  name = 'console';

  format(entry: LogEntryInternal): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const logger = entry.logger.padEnd(15);
    const correlation = entry.correlationId ? `[${entry.correlationId}] ` : '';
    const duration = entry.duration ? ` (${entry.duration}ms)` : '';
    
    let formatted = `${timestamp} ${level} ${logger} ${correlation}${entry.message}${duration}`;
    
    if (entry.error) {
      formatted += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    if (Object.keys(entry.metadata).length > 0) {
      formatted += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    return formatted;
  }
}

// Built-in transports
export class ConsoleTransport implements LogTransport {
  name = 'console';
  level = LogLevel.TRACE;
  enabled = true;

  write(formatted: string, entry: LogEntryInternal): void {
    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }
}

export class FileTransport implements LogTransport {
  name = 'file';
  level = LogLevel.INFO;
  enabled = false;

  constructor(private filename: string) {}

  write(formatted: string, entry: LogEntryInternal): void {
    // File writing implementation would go here
    // For now, just indicate it would write to file
    console.log(`[FILE:${this.filename}] ${formatted}`);
  }
}

// Factory for creating loggers
export class LoggerFactory {
  private static loggers = new Map<string, Logger>();
  private static defaultConfig: Partial<LoggerConfig> = {};

  static setDefaultConfig(config: Partial<LoggerConfig>): void {
    this.defaultConfig = config;
  }

  static getLogger(name: string, config?: Partial<LoggerConfig>): Logger {
    const key = `${name}:${JSON.stringify(config)}`;
    
    if (!this.loggers.has(key)) {
      const logger = new Logger(name, { ...this.defaultConfig, ...config });
      this.loggers.set(key, logger);
    }
    
    return this.loggers.get(key)!;
  }

  static createRequestLogger(requestId: string, correlationId?: string): Logger {
    return this.getLogger('request').withContext({
      requestId,
      correlationId: correlationId || requestId
    });
  }

  static createDatabaseLogger(): Logger {
    return this.getLogger('database').withTags('persistence');
  }

  static createApiLogger(): Logger {
    return this.getLogger('api').withTags('http', 'external');
  }

  static createBusinessLogger(): Logger {
    return this.getLogger('business').withTags('metrics', 'analytics');
  }

  static createSecurityLogger(): Logger {
    return this.getLogger('security').withTags('audit', 'compliance');
  }
}

// Global logger instance
export const logger = LoggerFactory.getLogger('app');