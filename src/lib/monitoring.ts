// Comprehensive monitoring and health check system
// BACKEND IMPROVEMENT: Production-ready monitoring and observability

import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';
import { database } from './database';

/**
 * Health check status types
 * IMPROVEMENT: Standardized health status reporting
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export interface ServiceHealth {
  status: HealthStatus;
  lastChecked: Date;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  version: string;
  uptime: number;
  services: Record<string, ServiceHealth>;
  metrics: SystemMetrics;
}

export interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage?: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  activeConnections: number;
}

/**
 * Performance metrics collector
 * IMPROVEMENT: Real-time performance monitoring
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, unknown[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  private constructor() {
    this.initializeMetrics();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initializeMetrics(): void {
    // Initialize basic counters
    this.counters.set('http_requests_total', 0);
    this.counters.set('http_errors_total', 0);
    this.counters.set('application_submissions_total', 0);
    this.counters.set('quote_requests_total', 0);
    
    // Initialize gauges
    this.gauges.set('active_connections', 0);
    this.gauges.set('memory_usage_bytes', 0);
    
    // Initialize histograms
    this.histograms.set('http_request_duration_ms', []);
    this.histograms.set('database_query_duration_ms', []);

    logger.info('Metrics collector initialized');
  }

  /**
   * Increment a counter metric
   * IMPROVEMENT: Thread-safe counter operations
   */
  public incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    
    // Log significant counter changes
    if (value > 1 || name.includes('error')) {
      logger.debug('Counter incremented', {
        metadata: { metric: name, value, newTotal: current + value, labels }
      });
    }
  }

  /**
   * Set a gauge metric value
   * IMPROVEMENT: Real-time gauge value tracking
   */
  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.gauges.set(name, value);
    
    logger.debug('Gauge updated', {
      metadata: { metric: name, value, labels }
    });
  }

  /**
   * Record a histogram value
   * IMPROVEMENT: Distribution metrics for performance analysis
   */
  public recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    
    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(name, values);
    
    // Log slow operations
    if ((name.includes('duration') && value > 1000) || 
        (name.includes('response') && value > 500)) {
      logger.warn('Slow operation detected', {
        metadata: { metric: name, value, labels }
      });
    }
  }

  /**
   * Get counter value
   * IMPROVEMENT: Metrics retrieval for reporting
   */
  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get gauge value
   * IMPROVEMENT: Current state metrics retrieval
   */
  public getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  /**
   * Get histogram statistics
   * IMPROVEMENT: Statistical analysis of performance metrics
   */
  public getHistogramStats(name: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const values = this.histograms.get(name) || [];
    
    if (values.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    
    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Get system uptime
   * IMPROVEMENT: Service availability tracking
   */
  public getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get memory usage statistics
   * IMPROVEMENT: Resource utilization monitoring
   */
  public getMemoryUsage(): SystemMetrics['memoryUsage'] {
    const memUsage = process.memoryUsage();
    const total = memUsage.heapTotal;
    const used = memUsage.heapUsed;
    
    return {
      used,
      total,
      percentage: (used / total) * 100
    };
  }

  /**
   * Get comprehensive system metrics
   * IMPROVEMENT: Centralized metrics aggregation
   */
  public getSystemMetrics(): SystemMetrics {
    const requestStats = this.getHistogramStats('http_request_duration_ms');
    
    return {
      memoryUsage: this.getMemoryUsage(),
      requestCount: this.getCounter('http_requests_total'),
      errorCount: this.getCounter('http_errors_total'),
      averageResponseTime: requestStats.avg,
      activeConnections: this.getGauge('active_connections'),
    };
  }

  /**
   * Export metrics in Prometheus format
   * IMPROVEMENT: Standards-compliant metrics export
   */
  public exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Export counters
    this.counters.forEach((value, name) => {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    });
    
    // Export gauges
    this.gauges.forEach((value, name) => {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    });
    
    // Export histogram statistics
    this.histograms.forEach((values, name) => {
      const stats = this.getHistogramStats(name);
      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_count ${stats.count}`);
      lines.push(`${name}_sum ${stats.sum}`);
      lines.push(`${name}_bucket{le="100"} ${values.filter(v => v <= 100).length}`);
      lines.push(`${name}_bucket{le="500"} ${values.filter(v => v <= 500).length}`);
      lines.push(`${name}_bucket{le="1000"} ${values.filter(v => v <= 1000).length}`);
      lines.push(`${name}_bucket{le="5000"} ${values.filter(v => v <= 5000).length}`);
      lines.push(`${name}_bucket{le="+Inf"} ${values.length}`);
    });
    
    return lines.join('\n');
  }
}

/**
 * Health check service for monitoring system components
 * IMPROVEMENT: Comprehensive health monitoring
 */
export class HealthCheckService {
  private static instance: HealthCheckService;
  private checks: Map<string, () => Promise<ServiceHealth>> = new Map();
  private lastResults: Map<string, ServiceHealth> = new Map();

  private constructor() {
    this.initializeChecks();
  }

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Initialize built-in health checks
   * IMPROVEMENT: Automated service health monitoring
   */
  private initializeChecks(): void {
    // Database health check
    this.registerCheck('database', async (): Promise<ServiceHealth> => {
      const startTime = Date.now();
      try {
        const isHealthy = await database.healthCheck();
        const responseTime = Date.now() - startTime;
        
        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          lastChecked: new Date(),
          responseTime,
          metadata: { provider: 'sqlite' }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Email service health check
    this.registerCheck('email', async (): Promise<ServiceHealth> => {
      const startTime = Date.now();
      try {
        // Test email configuration (without sending)
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });
        
        await transporter.verify();
        
        return {
          status: 'healthy',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          metadata: { service: 'gmail' }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Email service unavailable'
        };
      }
    });

    // File system health check
    this.registerCheck('storage', async (): Promise<ServiceHealth> => {
      const startTime = Date.now();
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Test write/read/delete operations
        const testFile = path.join(process.cwd(), 'tmp', `health-check-${Date.now()}.txt`);
        await fs.mkdir(path.dirname(testFile), { recursive: true });
        await fs.writeFile(testFile, 'health check test');
        await fs.readFile(testFile);
        await fs.unlink(testFile);
        
        return {
          status: 'healthy',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          metadata: { type: 'local_filesystem' }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Storage unavailable'
        };
      }
    });

    // Memory health check
    this.registerCheck('memory', async (): Promise<ServiceHealth> => {
      const startTime = Date.now();
      const memUsage = process.memoryUsage();
      const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      let status: HealthStatus = 'healthy';
      if (memoryPercentage > 90) {
        status = 'unhealthy';
      } else if (memoryPercentage > 75) {
        status = 'degraded';
      }
      
      return {
        status,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        metadata: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          percentage: memoryPercentage
        }
      };
    });

    logger.info('Health checks initialized', {
      metadata: { checkCount: this.checks.size }
    });
  }

  /**
   * Register a custom health check
   * IMPROVEMENT: Extensible health monitoring
   */
  public registerCheck(name: string, checkFn: () => Promise<ServiceHealth>): void {
    this.checks.set(name, checkFn);
    logger.info('Health check registered', { metadata: { name } });
  }

  /**
   * Run a specific health check
   * IMPROVEMENT: Individual service health verification
   */
  public async runCheck(name: string): Promise<ServiceHealth> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      throw new Error(`Health check '${name}' not found`);
    }

    try {
      const result = await checkFn();
      this.lastResults.set(name, result);
      
      if (result.status !== 'healthy') {
        logger.warn(`Health check failed: ${name}`, {
          metadata: { status: result.status, error: result.error }
        });
      }
      
      return result;
    } catch (error) {
      const result: ServiceHealth = {
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Check execution failed'
      };
      
      this.lastResults.set(name, result);
      logger.error(`Health check error: ${name}`, {
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return result;
    }
  }

  /**
   * Run all health checks
   * IMPROVEMENT: Comprehensive system health assessment
   */
  public async runAllChecks(): Promise<Map<string, ServiceHealth>> {
    const results = new Map<string, ServiceHealth>();
    const checkPromises = Array.from(this.checks.keys()).map(async (name) => {
      const result = await this.runCheck(name);
      results.set(name, result);
      return { name, result };
    });

    await Promise.allSettled(checkPromises);
    return results;
  }

  /**
   * Get system health summary
   * IMPROVEMENT: Overall system status determination
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const services = await this.runAllChecks();
    const metrics = MetricsCollector.getInstance().getSystemMetrics();
    
    // Determine overall system status
    let overallStatus: HealthStatus = 'healthy';
    const serviceStatuses = Array.from(services.values()).map(s => s.status);
    
    if (serviceStatuses.some(status => status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (serviceStatuses.some(status => status === 'degraded')) {
      overallStatus = 'degraded';
    }

    const systemHealth: SystemHealth = {
      status: overallStatus,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: MetricsCollector.getInstance().getUptime(),
      services: Object.fromEntries(services),
      metrics
    };

    // Log system health status
    logger.info('System health check completed', {
      metadata: {
        status: overallStatus,
        serviceCount: services.size,
        healthyServices: serviceStatuses.filter(s => s === 'healthy').length,
        unhealthyServices: serviceStatuses.filter(s => s === 'unhealthy').length
      }
    });

    return systemHealth;
  }

  /**
   * Get last check results without running new checks
   * IMPROVEMENT: Cached health status for performance
   */
  public getLastResults(): Map<string, ServiceHealth> {
    return new Map(this.lastResults);
  }
}

// Export singleton instances
export const metrics = MetricsCollector.getInstance();
export const healthCheck = HealthCheckService.getInstance();

/**
 * Monitoring middleware for API requests
 * IMPROVEMENT: Automatic request monitoring and metrics collection
 */
export function withMonitoring(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to request object
    (req as any).requestId = requestId;
    
    // Increment request counter
    metrics.incrementCounter('http_requests_total', 1, {
      method: req.method || 'UNKNOWN',
      endpoint: req.url || 'unknown'
    });
    
    // Track active connections
    const currentConnections = metrics.getGauge('active_connections');
    metrics.setGauge('active_connections', currentConnections + 1);

    try {
      await handler(req, res);
      
      // Record successful request duration
      const duration = Date.now() - startTime;
      metrics.recordHistogram('http_request_duration_ms', duration, {
        method: req.method || 'UNKNOWN',
        endpoint: req.url || 'unknown',
        status: res.statusCode.toString()
      });
      
    } catch (error) {
      // Record error
      metrics.incrementCounter('http_errors_total', 1, {
        method: req.method || 'UNKNOWN',
        endpoint: req.url || 'unknown',
        error: error instanceof Error ? error.name : 'Unknown'
      });
      
      logger.error('Request handler error', {
        requestId,
        error: error instanceof Error ? error : new Error(String(error)),
        endpoint: req.url,
        method: req.method
      });
      
      throw error;
    } finally {
      // Decrement active connections
      const activeConnections = metrics.getGauge('active_connections');
      metrics.setGauge('active_connections', Math.max(0, activeConnections - 1));
      
      // Update memory usage gauge
      const memoryUsage = metrics.getMemoryUsage();
      metrics.setGauge('memory_usage_bytes', memoryUsage.used);
    }
  };
}

/**
 * Business metrics tracking
 * IMPROVEMENT: Domain-specific metrics collection
 */
export function trackBusinessMetric(event: string, metadata?: Record<string, unknown>): void {
  metrics.incrementCounter(`business_events_total`, 1, { event });
  
  logger.logBusinessEvent(event, { metadata });
  
  // Track specific business events
  switch (event) {
    case 'application_submitted':
      metrics.incrementCounter('application_submissions_total');
      break;
    case 'quote_requested':
      metrics.incrementCounter('quote_requests_total');
      break;
  }
}

export default { metrics, healthCheck, withMonitoring, trackBusinessMetric };