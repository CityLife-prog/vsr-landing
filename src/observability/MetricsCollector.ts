/**
 * Metrics Collector - Comprehensive metrics collection and aggregation
 * Production-ready metrics system with time-series data and aggregations
 */

import { observability, MetricType, MetricPoint } from './ObservabilityCore';
import { logger } from './Logger';

export interface MetricsConfig {
  flushInterval: number;
  maxMetricsInMemory: number;
  enableHistogramBuckets: boolean;
  defaultTags: Record<string, string>;
  aggregationWindows: number[];
  percentiles: number[];
  retentionPolicy: RetentionPolicy;
}

export interface RetentionPolicy {
  raw: number;        // milliseconds to keep raw data points
  minute: number;     // milliseconds to keep 1-minute aggregations
  hour: number;       // milliseconds to keep 1-hour aggregations
  day: number;        // milliseconds to keep 1-day aggregations
}

export interface Histogram {
  buckets: number[];
  counts: number[];
  sum: number;
  count: number;
  min: number;
  max: number;
}

export interface Summary {
  count: number;
  sum: number;
  quantiles: Map<number, number>;
  min: number;
  max: number;
}

export interface TimeSeries {
  name: string;
  tags: Record<string, string>;
  points: DataPoint[];
  lastUpdated: number;
}

export interface DataPoint {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

export interface AggregatedMetric {
  name: string;
  tags: Record<string, string>;
  window: number;
  aggregations: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    rate: number;
    percentiles?: Record<number, number>;
  };
  timestamp: number;
}

export interface MetricExporter {
  export(metrics: AggregatedMetric[]): Promise<void>;
}

export class MetricsCollector {
  private config: MetricsConfig;
  private timeSeries = new Map<string, TimeSeries>();
  private histograms = new Map<string, Histogram>();
  private summaries = new Map<string, Summary>();
  private aggregations = new Map<string, AggregatedMetric[]>();
  private exporters: MetricExporter[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      flushInterval: 60000, // 1 minute
      maxMetricsInMemory: 10000,
      enableHistogramBuckets: true,
      defaultTags: {
        service: 'vsr-landing',
        environment: process.env.NODE_ENV || 'development'
      },
      aggregationWindows: [60000, 300000, 900000], // 1min, 5min, 15min
      percentiles: [50, 90, 95, 99],
      retentionPolicy: {
        raw: 24 * 60 * 60 * 1000,      // 24 hours
        minute: 7 * 24 * 60 * 60 * 1000, // 7 days
        hour: 30 * 24 * 60 * 60 * 1000,  // 30 days
        day: 365 * 24 * 60 * 60 * 1000   // 365 days
      },
      ...config
    };

    this.initializeMetrics();
  }

  // Core metric recording methods
  recordCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    const metricKey = this.getMetricKey(name, tags);
    const now = Date.now();

    // Get or create time series
    let series = this.timeSeries.get(metricKey);
    if (!series) {
      series = {
        name,
        tags: { ...this.config.defaultTags, ...tags },
        points: [],
        lastUpdated: now
      };
      this.timeSeries.set(metricKey, series);
    }

    // Add data point
    series.points.push({ timestamp: now, value });
    series.lastUpdated = now;

    // Update aggregations
    this.updateAggregations(name, value, tags, MetricType.COUNTER);

    // Record in observability core
    observability.recordCounter(name, value, tags);

    logger.trace(`Recorded counter: ${name}=${value}`, {
      metric: name,
      value,
      tags,
      component: 'metrics'
    });

    this.enforceMemoryLimits();
  }

  recordGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    const metricKey = this.getMetricKey(name, tags);
    const now = Date.now();

    // Get or create time series
    let series = this.timeSeries.get(metricKey);
    if (!series) {
      series = {
        name,
        tags: { ...this.config.defaultTags, ...tags },
        points: [],
        lastUpdated: now
      };
      this.timeSeries.set(metricKey, series);
    }

    // For gauges, replace the last value if it's within a short time window
    const lastPoint = series.points[series.points.length - 1];
    if (lastPoint && now - lastPoint.timestamp < 1000) {
      lastPoint.value = value;
      lastPoint.timestamp = now;
    } else {
      series.points.push({ timestamp: now, value });
    }
    
    series.lastUpdated = now;

    // Update aggregations
    this.updateAggregations(name, value, tags, MetricType.GAUGE);

    // Record in observability core
    observability.recordGauge(name, value, tags);

    logger.trace(`Recorded gauge: ${name}=${value}`, {
      metric: name,
      value,
      tags,
      component: 'metrics'
    });

    this.enforceMemoryLimits();
  }

  recordHistogram(name: string, value: number, tags: Record<string, string> = {}, buckets?: number[]): void {
    const metricKey = this.getMetricKey(name, tags);
    const now = Date.now();

    // Get or create histogram
    let histogram = this.histograms.get(metricKey);
    if (!histogram) {
      const defaultBuckets = buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
      histogram = {
        buckets: defaultBuckets,
        counts: new Array(defaultBuckets.length).fill(0),
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity
      };
      this.histograms.set(metricKey, histogram);
    }

    // Update histogram
    histogram.sum += value;
    histogram.count += 1;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);

    // Update bucket counts
    for (let i = 0; i < histogram.buckets.length; i++) {
      if (value <= histogram.buckets[i]) {
        histogram.counts[i] += 1;
      }
    }

    // Also record as time series for trending
    this.recordTimeSeries(name, value, tags, now);

    // Record in observability core
    observability.recordHistogram(name, value, tags);

    logger.trace(`Recorded histogram: ${name}=${value}`, {
      metric: name,
      value,
      tags,
      component: 'metrics'
    });

    this.enforceMemoryLimits();
  }

  recordTimer(name: string, duration: number, tags: Record<string, string> = {}): void {
    // Record as histogram for percentile calculations
    this.recordHistogram(`${name}.duration`, duration, tags);
    
    // Also record as counter for rate calculations
    this.recordCounter(`${name}.count`, 1, tags);

    logger.trace(`Recorded timer: ${name}=${duration}ms`, {
      metric: name,
      duration,
      tags,
      component: 'metrics'
    });
  }

  // Timing utilities
  startTimer(name: string, tags: Record<string, string> = {}): () => number {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordTimer(name, duration, tags);
      return duration;
    };
  }

  time<T>(name: string, fn: () => T, tags: Record<string, string> = {}): T {
    const endTimer = this.startTimer(name, tags);
    try {
      const result = fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      this.recordCounter(`${name}.error`, 1, { ...tags, error: 'true' });
      throw error;
    }
  }

  async timeAsync<T>(name: string, fn: () => Promise<T>, tags: Record<string, string> = {}): Promise<T> {
    const endTimer = this.startTimer(name, tags);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      this.recordCounter(`${name}.error`, 1, { ...tags, error: 'true' });
      throw error;
    }
  }

  // Business metrics
  recordBusinessEvent(event: string, value: number = 1, metadata: Record<string, any> = {}): void {
    const tags = {
      event_type: 'business',
      event_name: event,
      ...this.extractTagsFromMetadata(metadata)
    };

    this.recordCounter(`business.events`, value, tags);
    
    if (metadata.revenue) {
      this.recordGauge(`business.revenue`, metadata.revenue, tags);
    }

    if (metadata.customer_id) {
      this.recordCounter(`business.customers.active`, 1, { 
        ...tags, 
        customer_id: metadata.customer_id 
      });
    }

    logger.business(event, value, metadata);
  }

  recordUserAction(action: string, userId?: string, metadata: Record<string, any> = {}): void {
    const tags = {
      action,
      user_id: userId || 'anonymous',
      ...this.extractTagsFromMetadata(metadata)
    };

    this.recordCounter(`user.actions`, 1, tags);
    
    if (userId) {
      this.recordCounter(`user.actions.authenticated`, 1, tags);
    } else {
      this.recordCounter(`user.actions.anonymous`, 1, tags);
    }
  }

  recordApiMetrics(method: string, endpoint: string, statusCode: number, duration: number, size?: number): void {
    const tags = {
      method: method.toUpperCase(),
      endpoint: this.normalizeEndpoint(endpoint),
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`
    };

    this.recordCounter('api.requests', 1, tags);
    this.recordHistogram('api.request.duration', duration, tags);
    
    if (size !== undefined) {
      this.recordHistogram('api.response.size', size, tags);
    }

    if (statusCode >= 400) {
      this.recordCounter('api.errors', 1, tags);
    }
  }

  // Database metrics
  recordDatabaseQuery(operation: string, table: string, duration: number, rowsAffected?: number): void {
    const tags = {
      operation: operation.toLowerCase(),
      table,
      database: 'main'
    };

    this.recordCounter('database.queries', 1, tags);
    this.recordHistogram('database.query.duration', duration, tags);
    
    if (rowsAffected !== undefined) {
      this.recordHistogram('database.rows_affected', rowsAffected, tags);
    }
  }

  recordCacheMetrics(operation: string, key: string, hit: boolean, duration: number): void {
    const tags = {
      operation: operation.toLowerCase(),
      cache_type: 'memory',
      hit: hit.toString()
    };

    this.recordCounter('cache.operations', 1, tags);
    this.recordHistogram('cache.operation.duration', duration, tags);
    
    if (hit) {
      this.recordCounter('cache.hits', 1, tags);
    } else {
      this.recordCounter('cache.misses', 1, tags);
    }
  }

  // System metrics
  recordSystemMetrics(): void {
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      this.recordGauge('system.memory.heap_used', memUsage.heapUsed);
      this.recordGauge('system.memory.heap_total', memUsage.heapTotal);
      this.recordGauge('system.memory.external', memUsage.external);
      this.recordGauge('system.memory.rss', memUsage.rss);

      this.recordGauge('system.cpu.user', cpuUsage.user);
      this.recordGauge('system.cpu.system', cpuUsage.system);

      this.recordGauge('system.uptime', process.uptime() * 1000);
      this.recordGauge('system.active_handles', (process as any)._getActiveHandles().length);
      this.recordGauge('system.active_requests', (process as any)._getActiveRequests().length);
    }
  }

  // Query and aggregation methods
  getMetricValues(name: string, tags: Record<string, string> = {}, timeRange?: { start: number; end: number }): DataPoint[] {
    const metricKey = this.getMetricKey(name, tags);
    const series = this.timeSeries.get(metricKey);
    
    if (!series) return [];

    let points = series.points;
    
    if (timeRange) {
      points = points.filter(p => p.timestamp >= timeRange.start && p.timestamp <= timeRange.end);
    }

    return points;
  }

  getHistogramData(name: string, tags: Record<string, string> = {}): Histogram | undefined {
    const metricKey = this.getMetricKey(name, tags);
    return this.histograms.get(metricKey);
  }

  getAggregatedMetrics(name: string, window: number, tags: Record<string, string> = {}): AggregatedMetric[] {
    const metricKey = this.getMetricKey(name, tags);
    const aggregations = this.aggregations.get(metricKey) || [];
    
    return aggregations.filter(agg => agg.window === window);
  }

  calculatePercentiles(values: number[], percentiles: number[]): Record<number, number> {
    if (values.length === 0) return {};

    const sorted = [...values].sort((a, b) => a - b);
    const result: Record<number, number> = {};

    for (const p of percentiles) {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[p] = sorted[Math.max(0, index)];
    }

    return result;
  }

  // Export management
  addExporter(exporter: MetricExporter): void {
    this.exporters.push(exporter);
  }

  removeExporter(exporter: MetricExporter): void {
    const index = this.exporters.indexOf(exporter);
    if (index > -1) {
      this.exporters.splice(index, 1);
    }
  }

  async flush(): Promise<void> {
    const aggregatedMetrics = this.computeAggregations();
    
    if (aggregatedMetrics.length === 0) return;

    try {
      await Promise.all(
        this.exporters.map(exporter => exporter.export(aggregatedMetrics))
      );

      logger.debug(`Flushed ${aggregatedMetrics.length} aggregated metrics`, {
        count: aggregatedMetrics.length,
        component: 'metrics'
      });
    } catch (error) {
      logger.error('Failed to flush metrics', error as Error, {
        count: aggregatedMetrics.length,
        component: 'metrics'
      });
    }

    this.cleanupOldData();
  }

  // Private methods
  private getMetricKey(name: string, tags: Record<string, string>): string {
    const sortedTags = Object.entries({ ...this.config.defaultTags, ...tags })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    
    return `${name}{${sortedTags}}`;
  }

  private recordTimeSeries(name: string, value: number, tags: Record<string, string>, timestamp: number): void {
    const metricKey = this.getMetricKey(name, tags);
    
    let series = this.timeSeries.get(metricKey);
    if (!series) {
      series = {
        name,
        tags: { ...this.config.defaultTags, ...tags },
        points: [],
        lastUpdated: timestamp
      };
      this.timeSeries.set(metricKey, series);
    }

    series.points.push({ timestamp, value });
    series.lastUpdated = timestamp;
  }

  private updateAggregations(name: string, value: number, tags: Record<string, string>, type: MetricType): void {
    for (const window of this.config.aggregationWindows) {
      const windowStart = Math.floor(Date.now() / window) * window;
      const aggKey = this.getMetricKey(`${name}.agg.${window}`, tags);

      let aggregations = this.aggregations.get(aggKey) || [];
      let currentAgg = aggregations.find(agg => agg.timestamp === windowStart);

      if (!currentAgg) {
        currentAgg = {
          name,
          tags: { ...this.config.defaultTags, ...tags },
          window,
          aggregations: {
            count: 0,
            sum: 0,
            avg: 0,
            min: Infinity,
            max: -Infinity,
            rate: 0
          },
          timestamp: windowStart
        };
        aggregations.push(currentAgg);
        this.aggregations.set(aggKey, aggregations);
      }

      // Update aggregation values
      currentAgg.aggregations.count += 1;
      currentAgg.aggregations.sum += value;
      currentAgg.aggregations.min = Math.min(currentAgg.aggregations.min, value);
      currentAgg.aggregations.max = Math.max(currentAgg.aggregations.max, value);
      currentAgg.aggregations.avg = currentAgg.aggregations.sum / currentAgg.aggregations.count;
      currentAgg.aggregations.rate = currentAgg.aggregations.count / (window / 1000); // per second
    }
  }

  private computeAggregations(): AggregatedMetric[] {
    const result: AggregatedMetric[] = [];

    for (const [key, aggregations] of this.aggregations.entries()) {
      result.push(...aggregations);
    }

    return result;
  }

  private extractTagsFromMetadata(metadata: Record<string, any>): Record<string, string> {
    const tags: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        tags[key] = String(value);
      }
    }

    return tags;
  }

  private normalizeEndpoint(endpoint: string): string {
    // Replace path parameters with placeholders
    return endpoint
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9-]{8,}/g, '/:hash');
  }

  private enforceMemoryLimits(): void {
    const totalMetrics = this.timeSeries.size + this.histograms.size + this.summaries.size;
    
    if (totalMetrics > this.config.maxMetricsInMemory) {
      this.cleanupOldData();
    }
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const { raw, minute, hour, day } = this.config.retentionPolicy;

    // Clean up time series
    for (const [key, series] of this.timeSeries.entries()) {
      if (now - series.lastUpdated > raw) {
        this.timeSeries.delete(key);
        continue;
      }

      series.points = series.points.filter(point => now - point.timestamp < raw);
      
      if (series.points.length === 0) {
        this.timeSeries.delete(key);
      }
    }

    // Clean up aggregations
    for (const [key, aggregations] of this.aggregations.entries()) {
      const filtered = aggregations.filter(agg => {
        const age = now - agg.timestamp;
        
        if (agg.window <= 60000) return age < minute;      // 1 minute data
        if (agg.window <= 3600000) return age < hour;      // 1 hour data
        return age < day;                                   // 1 day data
      });

      if (filtered.length === 0) {
        this.aggregations.delete(key);
      } else {
        this.aggregations.set(key, filtered);
      }
    }

    logger.debug('Cleaned up old metrics data', {
      timeSeriesCount: this.timeSeries.size,
      histogramCount: this.histograms.size,
      aggregationCount: this.aggregations.size,
      component: 'metrics'
    });
  }

  private initializeMetrics(): void {
    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        logger.error('Metrics flush failed', error as Error, {
          component: 'metrics'
        });
      });
    }, this.config.flushInterval);

    // Start system metrics collection
    setInterval(() => {
      this.recordSystemMetrics();
    }, 30000); // Every 30 seconds

    // Record startup metric
    this.recordCounter('service.startup', 1);

    logger.info('Metrics collector initialized', {
      flushInterval: this.config.flushInterval,
      maxMetricsInMemory: this.config.maxMetricsInMemory,
      aggregationWindows: this.config.aggregationWindows,
      component: 'metrics'
    });
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    this.flush().catch(error => {
      logger.error('Final metrics flush failed', error as Error);
    });
  }
}

// Console exporter for development
export class ConsoleMetricsExporter implements MetricExporter {
  async export(metrics: AggregatedMetric[]): Promise<void> {
    for (const metric of metrics) {
      console.log(`[METRIC] ${metric.name}`, {
        tags: metric.tags,
        window: `${metric.window / 1000}s`,
        aggregations: metric.aggregations,
        timestamp: new Date(metric.timestamp).toISOString()
      });
    }
  }
}

// Prometheus-style exporter
export class PrometheusMetricsExporter implements MetricExporter {
  async export(metrics: AggregatedMetric[]): Promise<void> {
    const lines: string[] = [];
    
    for (const metric of metrics) {
      const name = metric.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const tags = Object.entries(metric.tags)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}_count{${tags}} ${metric.aggregations.count} ${metric.timestamp}`);
      lines.push(`${name}_sum{${tags}} ${metric.aggregations.sum} ${metric.timestamp}`);
      lines.push(`${name}_avg{${tags}} ${metric.aggregations.avg} ${metric.timestamp}`);
      lines.push(`${name}_min{${tags}} ${metric.aggregations.min} ${metric.timestamp}`);
      lines.push(`${name}_max{${tags}} ${metric.aggregations.max} ${metric.timestamp}`);
      lines.push(`${name}_rate{${tags}} ${metric.aggregations.rate} ${metric.timestamp}`);
    }

    console.log('[PROMETHEUS]\n' + lines.join('\n'));
  }
}

// Global instance
export const metricsCollector = new MetricsCollector();

// Add console exporter in development
if (process.env.NODE_ENV === 'development') {
  metricsCollector.addExporter(new ConsoleMetricsExporter());
}