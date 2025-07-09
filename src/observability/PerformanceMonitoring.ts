/**
 * Performance Monitoring & APM - Application Performance Monitoring
 * Comprehensive performance tracking, bottleneck detection, and optimization insights
 */

import { observability, TraceContext } from './ObservabilityCore';
import { logger } from './Logger';
import { metricsCollector } from './MetricsCollector';
import { distributedTracing } from './DistributedTracing';

export interface PerformanceConfig {
  enableRealUserMonitoring: boolean;
  enableSyntheticMonitoring: boolean;
  performanceThresholds: PerformanceThresholds;
  samplingRate: number;
  vitalsCollectionInterval: number;
  apdexTarget: number; // Apdex target time in milliseconds
  enableMemoryProfiling: boolean;
  enableCPUProfiling: boolean;
}

export interface PerformanceThresholds {
  pageLoad: { good: number; needs_improvement: number };
  firstContentfulPaint: { good: number; needs_improvement: number };
  largestContentfulPaint: { good: number; needs_improvement: number };
  firstInputDelay: { good: number; needs_improvement: number };
  cumulativeLayoutShift: { good: number; needs_improvement: number };
  apiResponse: { good: number; needs_improvement: number };
  databaseQuery: { good: number; needs_improvement: number };
  cacheOperation: { good: number; needs_improvement: number };
}

export interface WebVitals {
  // Core Web Vitals
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  
  // Additional metrics
  firstContentfulPaint?: number;
  timeToFirstByte?: number;
  domContentLoaded?: number;
  loadComplete?: number;
  
  // Navigation timing
  navigationStart?: number;
  redirectTime?: number;
  dnsLookup?: number;
  tcpConnect?: number;
  serverResponse?: number;
  domProcessing?: number;
  resourceLoad?: number;
}

export interface PerformanceProfile {
  timestamp: number;
  duration: number;
  operation: string;
  component: string;
  memory?: MemoryUsage;
  cpu?: CPUUsage;
  breakdown?: PerformanceBreakdown;
  context?: TraceContext;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers?: number;
}

export interface CPUUsage {
  user: number;
  system: number;
  userPercent?: number;
  systemPercent?: number;
}

export interface PerformanceBreakdown {
  database?: number;
  network?: number;
  computation?: number;
  rendering?: number;
  blocking?: number;
}

export interface ApdexScore {
  satisfied: number;
  tolerating: number;
  frustrated: number;
  score: number; // (satisfied + tolerating/2) / total
}

export interface PerformanceAlert {
  type: 'threshold_violation' | 'degradation' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  operation?: string;
  component?: string;
  context?: TraceContext;
  timestamp: number;
}

export class PerformanceMonitoring {
  private config: PerformanceConfig;
  private profiles = new Map<string, PerformanceProfile[]>();
  private webVitals = new Map<string, WebVitals>();
  private apdexScores = new Map<string, ApdexScore>();
  private performanceBaselines = new Map<string, number>();
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableRealUserMonitoring: true,
      enableSyntheticMonitoring: false,
      performanceThresholds: {
        pageLoad: { good: 2500, needs_improvement: 4000 },
        firstContentfulPaint: { good: 1800, needs_improvement: 3000 },
        largestContentfulPaint: { good: 2500, needs_improvement: 4000 },
        firstInputDelay: { good: 100, needs_improvement: 300 },
        cumulativeLayoutShift: { good: 0.1, needs_improvement: 0.25 },
        apiResponse: { good: 200, needs_improvement: 500 },
        databaseQuery: { good: 100, needs_improvement: 300 },
        cacheOperation: { good: 10, needs_improvement: 50 }
      },
      samplingRate: 1.0,
      vitalsCollectionInterval: 30000, // 30 seconds
      apdexTarget: 500, // 500ms
      enableMemoryProfiling: true,
      enableCPUProfiling: true,
      ...config
    };

    this.initializePerformanceMonitoring();
  }

  // Real User Monitoring (RUM)
  recordWebVitals(vitals: WebVitals, pageUrl?: string, userId?: string): void {
    if (!this.config.enableRealUserMonitoring || !this.shouldSample()) {
      return;
    }

    const sessionId = this.generateSessionId();
    const tags = {
      page_url: pageUrl || 'unknown',
      user_id: userId || 'anonymous',
      session_id: sessionId
    };

    this.webVitals.set(sessionId, vitals);

    // Record Core Web Vitals
    if (vitals.largestContentfulPaint) {
      metricsCollector.recordHistogram('web_vitals.lcp', vitals.largestContentfulPaint, tags);
      this.checkWebVitalThreshold('largestContentfulPaint', vitals.largestContentfulPaint, tags);
    }

    if (vitals.firstInputDelay) {
      metricsCollector.recordHistogram('web_vitals.fid', vitals.firstInputDelay, tags);
      this.checkWebVitalThreshold('firstInputDelay', vitals.firstInputDelay, tags);
    }

    if (vitals.cumulativeLayoutShift) {
      metricsCollector.recordHistogram('web_vitals.cls', vitals.cumulativeLayoutShift, tags);
      this.checkWebVitalThreshold('cumulativeLayoutShift', vitals.cumulativeLayoutShift, tags);
    }

    // Record additional metrics
    if (vitals.firstContentfulPaint) {
      metricsCollector.recordHistogram('web_vitals.fcp', vitals.firstContentfulPaint, tags);
      this.checkWebVitalThreshold('firstContentfulPaint', vitals.firstContentfulPaint, tags);
    }

    if (vitals.timeToFirstByte) {
      metricsCollector.recordHistogram('web_vitals.ttfb', vitals.timeToFirstByte, tags);
    }

    // Calculate page load time
    if (vitals.loadComplete && vitals.navigationStart) {
      const pageLoadTime = vitals.loadComplete - vitals.navigationStart;
      metricsCollector.recordHistogram('web_vitals.page_load', pageLoadTime, tags);
      this.checkWebVitalThreshold('pageLoad', pageLoadTime, tags);
      
      // Update Apdex score
      this.updateApdexScore('page_load', pageLoadTime);
    }

    logger.debug('Web vitals recorded', {
      vitals,
      page_url: pageUrl,
      user_id: userId,
      session_id: sessionId,
      component: 'performance_monitoring'
    });
  }

  // Application Performance Profiling
  async profileOperation<T>(
    operation: string,
    component: string,
    fn: (context: TraceContext) => Promise<T>,
    parentContext?: TraceContext
  ): Promise<T> {
    if (!this.shouldSample()) {
      return fn(parentContext || this.createDummyContext());
    }

    const context = distributedTracing.startChildSpan(
      `profile.${operation}`,
      parentContext || distributedTracing.startTrace('performance_profile')
    );

    const profile: PerformanceProfile = {
      timestamp: Date.now(),
      duration: 0,
      operation,
      component,
      context
    };

    let memoryBefore: MemoryUsage | undefined;
    let cpuBefore: CPUUsage | undefined;

    if (this.config.enableMemoryProfiling) {
      memoryBefore = this.getCurrentMemoryUsage();
    }

    if (this.config.enableCPUProfiling) {
      cpuBefore = this.getCurrentCPUUsage();
    }

    const startTime = Date.now();

    try {
      const result = await fn(context);
      const endTime = Date.now();
      profile.duration = endTime - startTime;

      // Capture post-execution metrics
      if (this.config.enableMemoryProfiling && memoryBefore) {
        const memoryAfter = this.getCurrentMemoryUsage();
        profile.memory = {
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal,
          external: memoryAfter.external - memoryBefore.external,
          rss: memoryAfter.rss - memoryBefore.rss
        };
      }

      if (this.config.enableCPUProfiling && cpuBefore) {
        const cpuAfter = this.getCurrentCPUUsage();
        profile.cpu = {
          user: cpuAfter.user - cpuBefore.user,
          system: cpuAfter.system - cpuBefore.system
        };
      }

      // Store profile
      this.storeProfile(profile);

      // Record metrics
      metricsCollector.recordHistogram(`performance.${component}.${operation}`, profile.duration, {
        component,
        operation
      });

      // Check thresholds
      this.checkPerformanceThresholds(profile);

      // Update Apdex
      this.updateApdexScore(`${component}.${operation}`, profile.duration);

      distributedTracing.addSpanTag(context, 'performance.duration_ms', profile.duration);
      if (profile.memory) {
        distributedTracing.addSpanTag(context, 'performance.memory_delta_mb', Math.round(profile.memory.heapUsed / 1024 / 1024));
      }

      distributedTracing.finishSpan(context);

      logger.performance(`${component}.${operation}`, profile.duration, {
        memory_delta_mb: profile.memory ? Math.round(profile.memory.heapUsed / 1024 / 1024) : 0,
        cpu_user: profile.cpu?.user || 0,
        cpu_system: profile.cpu?.system || 0
      });

      return result;
    } catch (error) {
      profile.duration = Date.now() - startTime;
      this.storeProfile(profile);

      distributedTracing.addSpanTag(context, 'error', true);
      distributedTracing.finishSpan(context, undefined, error as Error);

      logger.error(`Performance profile failed for ${component}.${operation}`, error as Error, {
        duration: profile.duration,
        component: 'performance_monitoring'
      });

      throw error;
    }
  }

  // Sync operation profiling
  profileOperationSync<T>(
    operation: string,
    component: string,
    fn: (context: TraceContext) => T,
    parentContext?: TraceContext
  ): T {
    if (!this.shouldSample()) {
      return fn(parentContext || this.createDummyContext());
    }

    const context = distributedTracing.startChildSpan(
      `profile.${operation}`,
      parentContext || distributedTracing.startTrace('performance_profile')
    );

    const startTime = Date.now();
    let memoryBefore: MemoryUsage | undefined;
    let cpuBefore: CPUUsage | undefined;

    if (this.config.enableMemoryProfiling) {
      memoryBefore = this.getCurrentMemoryUsage();
    }

    if (this.config.enableCPUProfiling) {
      cpuBefore = this.getCurrentCPUUsage();
    }

    try {
      const result = fn(context);
      const duration = Date.now() - startTime;

      const profile: PerformanceProfile = {
        timestamp: Date.now(),
        duration,
        operation,
        component,
        context
      };

      // Capture metrics if enabled
      if (this.config.enableMemoryProfiling && memoryBefore) {
        const memoryAfter = this.getCurrentMemoryUsage();
        profile.memory = {
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal,
          external: memoryAfter.external - memoryBefore.external,
          rss: memoryAfter.rss - memoryBefore.rss
        };
      }

      if (this.config.enableCPUProfiling && cpuBefore) {
        const cpuAfter = this.getCurrentCPUUsage();
        profile.cpu = {
          user: cpuAfter.user - cpuBefore.user,
          system: cpuAfter.system - cpuBefore.system
        };
      }

      this.storeProfile(profile);
      this.checkPerformanceThresholds(profile);
      this.updateApdexScore(`${component}.${operation}`, duration);

      metricsCollector.recordHistogram(`performance.${component}.${operation}`, duration, {
        component,
        operation
      });

      distributedTracing.addSpanTag(context, 'performance.duration_ms', duration);
      distributedTracing.finishSpan(context);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      distributedTracing.addSpanTag(context, 'error', true);
      distributedTracing.finishSpan(context, undefined, error as Error);
      throw error;
    }
  }

  // Resource timing analysis
  analyzeResourceTiming(resourceEntries: PerformanceResourceTiming[]): void {
    for (const entry of resourceEntries) {
      const resourceType = this.getResourceType(entry.name);
      const duration = entry.responseEnd - entry.startTime;

      metricsCollector.recordHistogram(`resource_timing.${resourceType}`, duration, {
        resource_type: resourceType,
        protocol: entry.nextHopProtocol || 'unknown'
      });

      // Analyze slow resources
      if (duration > 1000) { // Slower than 1 second
        this.triggerAlert({
          type: 'threshold_violation',
          severity: duration > 5000 ? 'high' : 'medium',
          metric: 'resource_load_time',
          value: duration,
          threshold: 1000,
          operation: resourceType,
          timestamp: Date.now()
        });
      }

      logger.debug(`Resource timing: ${entry.name}`, {
        resource_type: resourceType,
        duration,
        size: entry.transferSize,
        protocol: entry.nextHopProtocol,
        component: 'performance_monitoring'
      });
    }
  }

  // Memory leak detection
  detectMemoryLeaks(): void {
    if (!this.config.enableMemoryProfiling) return;

    const currentMemory = this.getCurrentMemoryUsage();
    const memoryGrowthKey = 'memory_growth';
    
    // Store historical memory usage
    const historyKey = `memory_history_${Date.now()}`;
    metricsCollector.recordGauge('memory.heap_used', currentMemory.heapUsed);
    metricsCollector.recordGauge('memory.heap_total', currentMemory.heapTotal);
    metricsCollector.recordGauge('memory.rss', currentMemory.rss);

    // Check for memory growth trend
    const recentMemory = metricsCollector.getMetricValues('memory.heap_used', {}, {
      start: Date.now() - 600000, // Last 10 minutes
      end: Date.now()
    });

    if (recentMemory.length > 1) {
      const oldestValue = recentMemory[0].value;
      const newestValue = recentMemory[recentMemory.length - 1].value;
      const growthPercent = ((newestValue - oldestValue) / oldestValue) * 100;

      if (growthPercent > 50) { // 50% growth in 10 minutes
        this.triggerAlert({
          type: 'anomaly',
          severity: growthPercent > 100 ? 'critical' : 'high',
          metric: 'memory_growth',
          value: growthPercent,
          threshold: 50,
          operation: 'memory_monitoring',
          timestamp: Date.now()
        });

        logger.warn('Potential memory leak detected', {
          growth_percent: growthPercent,
          current_heap: currentMemory.heapUsed,
          time_window: '10 minutes',
          component: 'performance_monitoring'
        });
      }
    }
  }

  // Performance baseline establishment
  establishBaseline(operation: string, component: string): void {
    const profiles = this.profiles.get(`${component}.${operation}`) || [];
    
    if (profiles.length >= 100) { // Need at least 100 samples
      const durations = profiles.map(p => p.duration).sort((a, b) => a - b);
      const p95 = durations[Math.floor(durations.length * 0.95)];
      
      this.performanceBaselines.set(`${component}.${operation}`, p95);
      
      logger.info(`Performance baseline established for ${component}.${operation}`, {
        p95_baseline: p95,
        sample_count: profiles.length,
        component: 'performance_monitoring'
      });
    }
  }

  // Anomaly detection
  detectPerformanceAnomalies(): void {
    for (const [key, baseline] of this.performanceBaselines.entries()) {
      const profiles = this.profiles.get(key) || [];
      const recentProfiles = profiles.filter(p => Date.now() - p.timestamp < 300000); // Last 5 minutes

      if (recentProfiles.length > 0) {
        const recentAverage = recentProfiles.reduce((sum, p) => sum + p.duration, 0) / recentProfiles.length;
        const anomalyThreshold = baseline * 2; // 200% of baseline

        if (recentAverage > anomalyThreshold) {
          this.triggerAlert({
            type: 'anomaly',
            severity: recentAverage > baseline * 3 ? 'critical' : 'high',
            metric: 'response_time_anomaly',
            value: recentAverage,
            threshold: anomalyThreshold,
            operation: key,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  // Apdex score calculation
  calculateApdexScore(operation: string): ApdexScore | null {
    return this.apdexScores.get(operation) || null;
  }

  // Get performance summary
  getPerformanceSummary(timeRange?: { start: number; end: number }): {
    totalOperations: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    apdexScores: Record<string, ApdexScore>;
    slowestOperations: Array<{ operation: string; avgDuration: number }>;
    memoryUsage?: MemoryUsage;
  } {
    const now = Date.now();
    const range = timeRange || { start: now - 3600000, end: now }; // Default: last hour

    let allProfiles: PerformanceProfile[] = [];
    let totalErrors = 0;

    // Collect all profiles in time range
    for (const profiles of this.profiles.values()) {
      const filteredProfiles = profiles.filter(p => 
        p.timestamp >= range.start && p.timestamp <= range.end
      );
      allProfiles = allProfiles.concat(filteredProfiles);
    }

    if (allProfiles.length === 0) {
      return {
        totalOperations: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0,
        apdexScores: {},
        slowestOperations: [],
        memoryUsage: this.config.enableMemoryProfiling ? this.getCurrentMemoryUsage() : undefined
      };
    }

    // Calculate metrics
    const durations = allProfiles.map(p => p.duration).sort((a, b) => a - b);
    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95ResponseTime = durations[Math.floor(durations.length * 0.95)];

    // Calculate operation averages
    const operationDurations = new Map<string, number[]>();
    for (const profile of allProfiles) {
      const key = `${profile.component}.${profile.operation}`;
      if (!operationDurations.has(key)) {
        operationDurations.set(key, []);
      }
      operationDurations.get(key)!.push(profile.duration);
    }

    const slowestOperations = Array.from(operationDurations.entries())
      .map(([operation, durations]) => ({
        operation,
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      totalOperations: allProfiles.length,
      averageResponseTime,
      p95ResponseTime,
      errorRate: (totalErrors / allProfiles.length) * 100,
      apdexScores: Object.fromEntries(this.apdexScores.entries()),
      slowestOperations,
      memoryUsage: this.config.enableMemoryProfiling ? this.getCurrentMemoryUsage() : undefined
    };
  }

  // Alert subscription
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // Private methods
  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createDummyContext(): TraceContext {
    return {
      traceId: '',
      spanId: '',
      correlationId: '',
      operationName: 'dummy',
      startTime: Date.now(),
      attributes: {},
      baggage: {}
    };
  }

  private getCurrentMemoryUsage(): MemoryUsage {
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      return {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      };
    }
    return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
  }

  private getCurrentCPUUsage(): CPUUsage {
    if (typeof process !== 'undefined') {
      const cpuUsage = process.cpuUsage();
      return {
        user: cpuUsage.user,
        system: cpuUsage.system
      };
    }
    return { user: 0, system: 0 };
  }

  private storeProfile(profile: PerformanceProfile): void {
    const key = `${profile.component}.${profile.operation}`;
    if (!this.profiles.has(key)) {
      this.profiles.set(key, []);
    }
    
    const profiles = this.profiles.get(key)!;
    profiles.push(profile);
    
    // Keep only last 1000 profiles per operation
    if (profiles.length > 1000) {
      profiles.splice(0, profiles.length - 1000);
    }
  }

  private checkWebVitalThreshold(metric: keyof PerformanceThresholds, value: number, tags: Record<string, string>): void {
    const threshold = this.config.performanceThresholds[metric];
    if (!threshold) return;

    let severity: 'low' | 'medium' | 'high' = 'low';
    let violated = false;

    if (value > threshold.needs_improvement) {
      severity = value > threshold.needs_improvement * 2 ? 'high' : 'medium';
      violated = true;
    }

    if (violated) {
      this.triggerAlert({
        type: 'threshold_violation',
        severity,
        metric: `web_vitals.${metric}`,
        value,
        threshold: threshold.needs_improvement,
        timestamp: Date.now()
      });
    }

    // Record performance classification
    let classification = 'good';
    if (value > threshold.needs_improvement) {
      classification = 'poor';
    } else if (value > threshold.good) {
      classification = 'needs_improvement';
    }

    metricsCollector.recordCounter(`web_vitals.${metric}.classification`, 1, {
      ...tags,
      classification
    });
  }

  private checkPerformanceThresholds(profile: PerformanceProfile): void {
    const thresholdMap: Record<string, keyof PerformanceThresholds> = {
      'api': 'apiResponse',
      'database': 'databaseQuery',
      'cache': 'cacheOperation'
    };

    const thresholdKey = thresholdMap[profile.component];
    if (!thresholdKey) return;

    const threshold = this.config.performanceThresholds[thresholdKey];
    if (profile.duration > threshold.needs_improvement) {
      this.triggerAlert({
        type: 'threshold_violation',
        severity: profile.duration > threshold.needs_improvement * 2 ? 'high' : 'medium',
        metric: `${profile.component}.response_time`,
        value: profile.duration,
        threshold: threshold.needs_improvement,
        operation: profile.operation,
        component: profile.component,
        context: profile.context,
        timestamp: profile.timestamp
      });
    }
  }

  private updateApdexScore(operation: string, duration: number): void {
    if (!this.apdexScores.has(operation)) {
      this.apdexScores.set(operation, {
        satisfied: 0,
        tolerating: 0,
        frustrated: 0,
        score: 0
      });
    }

    const apdex = this.apdexScores.get(operation)!;
    const target = this.config.apdexTarget;

    if (duration <= target) {
      apdex.satisfied++;
    } else if (duration <= target * 4) {
      apdex.tolerating++;
    } else {
      apdex.frustrated++;
    }

    const total = apdex.satisfied + apdex.tolerating + apdex.frustrated;
    apdex.score = (apdex.satisfied + apdex.tolerating / 2) / total;

    // Record Apdex score
    metricsCollector.recordGauge(`apdex.${operation}`, apdex.score, {
      operation
    });
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['js', 'ts', 'jsx', 'tsx'].includes(extension || '')) return 'script';
    if (['css', 'scss', 'sass'].includes(extension || '')) return 'stylesheet';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension || '')) return 'font';
    if (['json', 'xml'].includes(extension || '')) return 'xhr';
    
    return 'other';
  }

  private triggerAlert(alert: PerformanceAlert): void {
    logger.warn(`Performance alert: ${alert.type}`, {
      alert_type: alert.type,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      operation: alert.operation,
      component: alert.component,
      component_type: 'performance_monitoring'
    });

    metricsCollector.recordCounter('performance.alerts', 1, {
      type: alert.type,
      severity: alert.severity,
      metric: alert.metric,
      operation: alert.operation || 'unknown',
      component: alert.component || 'unknown'
    });

    // Notify subscribers
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Performance alert callback failed', error as Error);
      }
    }
  }

  private initializePerformanceMonitoring(): void {
    // Start vitals collection if RUM is enabled
    if (this.config.enableRealUserMonitoring) {
      setInterval(() => {
        this.detectMemoryLeaks();
        this.detectPerformanceAnomalies();
      }, this.config.vitalsCollectionInterval);
    }

    // Establish baselines for common operations
    setInterval(() => {
      for (const key of this.profiles.keys()) {
        const [component, operation] = key.split('.');
        this.establishBaseline(operation, component);
      }
    }, 300000); // Every 5 minutes

    logger.info('Performance monitoring initialized', {
      enable_rum: this.config.enableRealUserMonitoring,
      enable_synthetic: this.config.enableSyntheticMonitoring,
      sampling_rate: this.config.samplingRate,
      apdex_target: this.config.apdexTarget,
      component: 'performance_monitoring'
    });
  }

  // Cleanup
  destroy(): void {
    // Clear data structures
    this.profiles.clear();
    this.webVitals.clear();
    this.apdexScores.clear();
    this.performanceBaselines.clear();
    this.alertCallbacks.length = 0;

    logger.info('Performance monitoring destroyed', {
      component: 'performance_monitoring'
    });
  }
}

// Global instance
export const performanceMonitoring = new PerformanceMonitoring();

// Browser-specific Web Vitals integration
if (typeof window !== 'undefined') {
  // Integration with Web Vitals library would go here
  // This is a placeholder for actual implementation
  
  const observeWebVitals = () => {
    // LCP observer
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          performanceMonitoring.recordWebVitals({
            largestContentfulPaint: lastEntry.startTime
          }, window.location.href);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FCP observer
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint') as any;
        if (fcpEntry) {
          performanceMonitoring.recordWebVitals({
            firstContentfulPaint: fcpEntry.startTime
          }, window.location.href);
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Resource timing observer
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];
        performanceMonitoring.analyzeResourceTiming(entries);
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    }

    // Page load timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          performanceMonitoring.recordWebVitals({
            navigationStart: navigation.startTime,
            redirectTime: navigation.redirectEnd - navigation.redirectStart,
            dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcpConnect: navigation.connectEnd - navigation.connectStart,
            serverResponse: navigation.responseEnd - navigation.requestStart,
            domProcessing: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.startTime,
            timeToFirstByte: navigation.responseStart - navigation.requestStart
          }, window.location.href);
        }
      }, 0);
    });
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeWebVitals);
  } else {
    observeWebVitals();
  }
}

// Types are already exported above in their definitions