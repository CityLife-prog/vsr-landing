// Enhanced logging system with structured logging and metrics
// BACKEND IMPROVEMENT: Professional logging infrastructure

import { NextApiRequest } from 'next';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  environment: string;
  service: string;
  version: string;
}

/**
 * Enhanced Logger class with structured logging capabilities
 * IMPROVEMENT RATIONALE:
 * - Structured logging for better analysis and monitoring
 * - Correlation IDs for request tracing
 * - Performance metrics tracking
 * - Security-aware PII filtering
 * - Multiple output formats (JSON, human-readable)
 * - Integration-ready for external logging services
 */
class Logger {
  private static instance: Logger;
  private sensitiveFields = [
    'password', 'secret', 'token', 'key', 'auth', 'credential',
    'email', 'phone', 'ssn', 'credit', 'card', 'account'
  ];

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Generate unique request ID for correlation
   * IMPROVEMENT: Request tracing across distributed systems
   */
  public generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract request context for logging
   * IMPROVEMENT: Comprehensive request metadata capture
   */
  public extractRequestContext(req: NextApiRequest, requestId?: string): LogContext {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor?.split(',')[0] || req.socket.remoteAddress || 'unknown';

    return {
      requestId: requestId || this.generateRequestId(),
      endpoint: req.url,
      method: req.method,
      ip: this.maskIP(ip),
      userAgent: this.sanitizeUserAgent(req.headers['user-agent']),
    };
  }

  /**
   * Sanitize sensitive data from objects
   * IMPROVEMENT: Enhanced PII protection with deep object traversal
   */
  private sanitizeData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive) {
        sanitized[key] = this.maskSensitiveValue(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Mask sensitive values while preserving type information
   * IMPROVEMENT: Smart masking that preserves debugging context
   */
  private maskSensitiveValue(value: unknown): string {
    if (typeof value === 'string') {
      if (value.includes('@')) {
        // Email masking: show first char and domain
        const [local, domain] = value.split('@');
        return `${local[0]}***@${domain}`;
      }
      return `***${value.slice(-2)}`;
    }
    return '***';
  }

  /**
   * Mask IP address for privacy
   * IMPROVEMENT: GDPR-compliant IP address handling
   */
  private maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      // IPv4: mask last octet
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
    // IPv6 or other: mask last segment
    return ip.replace(/:[^:]*$/, ':***');
  }

  /**
   * Sanitize user agent string
   * IMPROVEMENT: Privacy-aware user agent logging
   */
  private sanitizeUserAgent(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    // Extract browser and version only, remove detailed system info
    const simplified = userAgent.replace(/\([^)]*\)/g, '').trim();
    return simplified.length > 100 ? simplified.substring(0, 100) + '...' : simplified;
  }

  /**
   * Create structured log entry
   * IMPROVEMENT: Consistent log format for analysis tools
   */
  private createLogEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeData(context) as LogContext,
      environment: process.env.NODE_ENV || 'development',
      service: 'vsr-landing',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Format log entry for output
   * IMPROVEMENT: Human-readable development logs, structured production logs
   */
  private formatLogEntry(entry: LogEntry): string {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // Human-readable format for development
      const contextStr = Object.keys(entry.context).length > 0 
        ? ` | ${JSON.stringify(entry.context, null, 2)}`
        : '';
      
      return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
    } else {
      // JSON format for production (better for log aggregation)
      return JSON.stringify(entry);
    }
  }

  /**
   * Core logging method
   * IMPROVEMENT: Centralized logging with multiple output options
   */
  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    const entry = this.createLogEntry(level, message, context);
    const formatted = this.formatLogEntry(entry);

    // Console output (in production, this would route to appropriate log service)
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }

    // In production, this is where you'd integrate with:
    // - Winston for file logging
    // - DataDog, New Relic, or CloudWatch for monitoring
    // - Sentry for error tracking
    // - ELK stack for log aggregation
  }

  // Public logging methods
  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  public fatal(message: string, context?: LogContext): void {
    this.log('fatal', message, context);
  }

  /**
   * Log API request start
   * IMPROVEMENT: Request lifecycle tracking
   */
  public logRequestStart(req: NextApiRequest, requestId: string): void {
    const context = this.extractRequestContext(req, requestId);
    this.info('API request started', {
      ...context,
      metadata: {
        bodySize: req.headers['content-length'] || 0,
        contentType: req.headers['content-type'],
      }
    });
  }

  /**
   * Log API request completion
   * IMPROVEMENT: Performance monitoring and response tracking
   */
  public logRequestEnd(
    req: NextApiRequest, 
    requestId: string, 
    statusCode: number, 
    duration: number,
    error?: Error
  ): void {
    const context = this.extractRequestContext(req, requestId);
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.log(level, `API request completed`, {
      ...context,
      statusCode,
      duration,
      error: error || undefined,
      metadata: {
        ...context.metadata,
        errorDetails: error ? {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        } : undefined,
      }
    });
  }

  /**
   * Log business events
   * IMPROVEMENT: Business intelligence and analytics tracking
   */
  public logBusinessEvent(event: string, context: LogContext = {}): void {
    this.info(`Business event: ${event}`, {
      ...context,
      metadata: {
        ...context.metadata,
        eventType: 'business',
        event,
      }
    });
  }

  /**
   * Log security events
   * IMPROVEMENT: Security monitoring and threat detection
   */
  public logSecurityEvent(event: string, context: LogContext = {}): void {
    this.warn(`Security event: ${event}`, {
      ...context,
      metadata: {
        ...context.metadata,
        eventType: 'security',
        event,
      }
    });
  }

  /**
   * Log performance metrics
   * IMPROVEMENT: Application performance monitoring
   */
  public logPerformanceMetric(metric: string, value: number, context: LogContext = {}): void {
    this.info(`Performance metric: ${metric}`, {
      ...context,
      metadata: {
        ...context.metadata,
        metricType: 'performance',
        metric,
        value,
      }
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

/**
 * Request timing middleware helper
 * IMPROVEMENT: Automated performance tracking
 */
export class RequestTimer {
  private startTime: number;
  private requestId: string;
  private req: NextApiRequest;

  constructor(req: NextApiRequest) {
    this.startTime = Date.now();
    this.requestId = logger.generateRequestId();
    this.req = req;
    
    logger.logRequestStart(req, this.requestId);
  }

  public end(statusCode: number, error?: Error): void {
    const duration = Date.now() - this.startTime;
    logger.logRequestEnd(this.req, this.requestId, statusCode, duration, error);
    
    // Log performance metrics
    if (duration > 1000) {
      logger.logPerformanceMetric('slow_request', duration, {
        requestId: this.requestId,
        endpoint: this.req.url,
      });
    }
  }

  public getRequestId(): string {
    return this.requestId;
  }
}

/**
 * Error serialization utility
 * IMPROVEMENT: Better error tracking and debugging
 */
export function serializeError(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Async error handler wrapper
 * IMPROVEMENT: Standardized async error handling
 */
export function asyncErrorHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error('Async operation failed', {
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { 
          operation: fn.name,
          errorDetails: error instanceof Error ? serializeError(error) : { message: String(error) }
        }
      });
      throw error;
    }
  };
}

export default logger;