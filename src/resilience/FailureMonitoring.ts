/**
 * Failure Monitoring and Metrics - Resilience Layer
 * Comprehensive monitoring and metrics collection for resilience patterns
 */

export interface FailureMetric {
  id: string;
  timestamp: Date;
  operationName: string;
  failureType: string;
  errorMessage: string;
  stackTrace?: string;
  duration: number;
  retryAttempts: number;
  recoveryStrategy?: string;
  circuitBreakerState?: string;
  userAgent?: string;
  ipAddress?: string;
  correlationId?: string;
  metadata: Record<string, any>;
}

export interface ResilienceMetrics {
  totalFailures: number;
  failureRate: number;
  averageFailureDuration: number;
  failuresByType: Record<string, number>;
  failuresByOperation: Record<string, number>;
  recoverySuccessRate: number;
  circuitBreakerTrips: number;
  retrySuccessRate: number;
  mostCommonFailures: Array<{ type: string; count: number; percentage: number }>;
  timeToRecovery: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface AlertCondition {
  id: string;
  name: string;
  description: string;
  condition: (metrics: ResilienceMetrics, recentFailures: FailureMetric[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownMs: number;
  enabled: boolean;
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  conditionId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metrics: ResilienceMetrics;
  acknowledged: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export class FailureMonitoringService {
  private failures: FailureMetric[] = [];
  private alerts: Alert[] = [];
  private alertConditions: AlertCondition[] = [];
  private subscribers: Array<(alert: Alert) => void> = [];
  private config: MonitoringConfig;
  private monitoringTimer?: NodeJS.Timeout;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      maxFailureHistory: 10000,
      metricsWindowMs: 3600000, // 1 hour
      alertingEnabled: true,
      alertCooldownMs: 300000, // 5 minutes
      enableAutoCleanup: true,
      cleanupIntervalMs: 3600000, // 1 hour
      enableRealtimeMonitoring: true,
      monitoringIntervalMs: 30000, // 30 seconds
      ...config
    };

    this.setupDefaultAlertConditions();
    
    if (this.config.enableRealtimeMonitoring) {
      this.startRealtimeMonitoring();
    }

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  recordFailure(failure: Omit<FailureMetric, 'id' | 'timestamp'>): void {
    const failureMetric: FailureMetric = {
      id: this.generateId(),
      timestamp: new Date(),
      ...failure
    };

    this.failures.push(failureMetric);

    // Trim history if it gets too large
    if (this.failures.length > this.config.maxFailureHistory) {
      this.failures = this.failures.slice(-this.config.maxFailureHistory);
    }

    // Check for alert conditions
    if (this.config.alertingEnabled) {
      this.checkAlertConditions();
    }

    // Log the failure
    console.error(`Failure recorded: ${failure.operationName} - ${failure.failureType}`, failureMetric);
  }

  getMetrics(windowMs?: number): ResilienceMetrics {
    const window = windowMs || this.config.metricsWindowMs;
    const cutoff = new Date(Date.now() - window);
    const recentFailures = this.failures.filter(f => f.timestamp >= cutoff);

    const totalFailures = recentFailures.length;
    const failureRate = this.calculateFailureRate(recentFailures, window);
    const averageFailureDuration = this.calculateAverageFailureDuration(recentFailures);
    const failuresByType = this.groupFailuresByType(recentFailures);
    const failuresByOperation = this.groupFailuresByOperation(recentFailures);
    const recoverySuccessRate = this.calculateRecoverySuccessRate(recentFailures);
    const circuitBreakerTrips = this.countCircuitBreakerTrips(recentFailures);
    const retrySuccessRate = this.calculateRetrySuccessRate(recentFailures);
    const mostCommonFailures = this.getMostCommonFailures(recentFailures);
    const timeToRecovery = this.calculateTimeToRecovery(recentFailures);

    return {
      totalFailures,
      failureRate,
      averageFailureDuration,
      failuresByType,
      failuresByOperation,
      recoverySuccessRate,
      circuitBreakerTrips,
      retrySuccessRate,
      mostCommonFailures,
      timeToRecovery
    };
  }

  getRecentFailures(count: number = 50): FailureMetric[] {
    return this.failures
      .slice(-count)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getFailuresByOperation(operationName: string, limit: number = 100): FailureMetric[] {
    return this.failures
      .filter(f => f.operationName === operationName)
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getFailuresByType(failureType: string, limit: number = 100): FailureMetric[] {
    return this.failures
      .filter(f => f.failureType === failureType)
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Alert management
  addAlertCondition(condition: Omit<AlertCondition, 'id'>): string {
    const alertCondition: AlertCondition = {
      id: this.generateId(),
      ...condition
    };

    this.alertConditions.push(alertCondition);
    return alertCondition.id;
  }

  removeAlertCondition(conditionId: string): boolean {
    const index = this.alertConditions.findIndex(c => c.id === conditionId);
    if (index !== -1) {
      this.alertConditions.splice(index, 1);
      return true;
    }
    return false;
  }

  getAlertConditions(): AlertCondition[] {
    return [...this.alertConditions];
  }

  getAlerts(unacknowledgedOnly: boolean = false): Alert[] {
    const alerts = [...this.alerts];
    return unacknowledgedOnly 
      ? alerts.filter(a => !a.acknowledged)
      : alerts;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Subscription management
  subscribe(callback: (alert: Alert) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private checkAlertConditions(): void {
    const metrics = this.getMetrics();
    const recentFailures = this.getRecentFailures(100);

    for (const condition of this.alertConditions) {
      if (!condition.enabled) continue;

      // Check cooldown
      if (condition.lastTriggered && 
          Date.now() - condition.lastTriggered.getTime() < condition.cooldownMs) {
        continue;
      }

      try {
        if (condition.condition(metrics, recentFailures)) {
          this.triggerAlert(condition, metrics);
        }
      } catch (error) {
        console.error(`Error evaluating alert condition ${condition.id}:`, error);
      }
    }
  }

  private triggerAlert(condition: AlertCondition, metrics: ResilienceMetrics): void {
    const alert: Alert = {
      id: this.generateId(),
      conditionId: condition.id,
      timestamp: new Date(),
      severity: condition.severity,
      title: condition.name,
      message: condition.description,
      metrics,
      acknowledged: false,
      metadata: {}
    };

    this.alerts.push(alert);
    condition.lastTriggered = new Date();

    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert subscriber:', error);
      }
    });

    console.warn(`Alert triggered: ${alert.title}`, alert);
  }

  private setupDefaultAlertConditions(): void {
    // High failure rate alert
    this.addAlertCondition({
      name: 'High Failure Rate',
      description: 'Failure rate exceeds 10% in the last 5 minutes',
      condition: (metrics) => metrics.failureRate > 10,
      severity: 'high',
      cooldownMs: 300000,
      enabled: true
    });

    // Circuit breaker trips alert
    this.addAlertCondition({
      name: 'Multiple Circuit Breaker Trips',
      description: 'More than 3 circuit breaker trips in the last 10 minutes',
      condition: (metrics) => metrics.circuitBreakerTrips > 3,
      severity: 'medium',
      cooldownMs: 600000,
      enabled: true
    });

    // Low recovery success rate
    this.addAlertCondition({
      name: 'Low Recovery Success Rate',
      description: 'Recovery success rate below 80%',
      condition: (metrics) => metrics.recoverySuccessRate < 80,
      severity: 'medium',
      cooldownMs: 900000,
      enabled: true
    });

    // High failure count for specific operation
    this.addAlertCondition({
      name: 'Operation Experiencing High Failures',
      description: 'Single operation has more than 50 failures',
      condition: (metrics) => {
        const maxFailures = Math.max(...Object.values(metrics.failuresByOperation));
        return maxFailures > 50;
      },
      severity: 'high',
      cooldownMs: 300000,
      enabled: true
    });

    // Critical error spike
    this.addAlertCondition({
      name: 'Critical Error Spike',
      description: 'More than 100 failures in the last hour',
      condition: (metrics) => metrics.totalFailures > 100,
      severity: 'critical',
      cooldownMs: 600000,
      enabled: true
    });
  }

  private startRealtimeMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitoringIntervalMs);
  }

  private startAutoCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, this.config.cleanupIntervalMs);
  }

  private performHealthCheck(): void {
    const metrics = this.getMetrics();
    
    // Log current health status
    if (metrics.totalFailures > 0) {
      console.log('Resilience Health Check:', {
        totalFailures: metrics.totalFailures,
        failureRate: metrics.failureRate.toFixed(2) + '%',
        recoverySuccessRate: metrics.recoverySuccessRate.toFixed(2) + '%',
        circuitBreakerTrips: metrics.circuitBreakerTrips
      });
    }
  }

  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - (this.config.metricsWindowMs * 24)); // Keep 24 windows worth
    
    // Clean up old failures
    this.failures = this.failures.filter(f => f.timestamp >= cutoff);
    
    // Clean up old resolved alerts
    this.alerts = this.alerts.filter(a => 
      !a.resolvedAt || a.resolvedAt >= cutoff
    );

    console.log(`Cleaned up old monitoring data. Failures: ${this.failures.length}, Alerts: ${this.alerts.length}`);
  }

  // Metric calculation methods
  private calculateFailureRate(failures: FailureMetric[], windowMs: number): number {
    // Simple calculation: failures per minute
    const windowMinutes = windowMs / 60000;
    return failures.length / windowMinutes;
  }

  private calculateAverageFailureDuration(failures: FailureMetric[]): number {
    if (failures.length === 0) return 0;
    const totalDuration = failures.reduce((sum, f) => sum + f.duration, 0);
    return totalDuration / failures.length;
  }

  private groupFailuresByType(failures: FailureMetric[]): Record<string, number> {
    return failures.reduce((acc, failure) => {
      acc[failure.failureType] = (acc[failure.failureType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupFailuresByOperation(failures: FailureMetric[]): Record<string, number> {
    return failures.reduce((acc, failure) => {
      acc[failure.operationName] = (acc[failure.operationName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateRecoverySuccessRate(failures: FailureMetric[]): number {
    const failuresWithRecovery = failures.filter(f => f.recoveryStrategy);
    if (failuresWithRecovery.length === 0) return 100;
    
    // Assume recovery was successful if no subsequent failure within short timeframe
    const successfulRecoveries = failuresWithRecovery.filter(f => {
      const subsequentFailures = failures.filter(sf => 
        sf.operationName === f.operationName &&
        sf.timestamp > f.timestamp &&
        sf.timestamp.getTime() - f.timestamp.getTime() < 60000 // Within 1 minute
      );
      return subsequentFailures.length === 0;
    });

    return (successfulRecoveries.length / failuresWithRecovery.length) * 100;
  }

  private countCircuitBreakerTrips(failures: FailureMetric[]): number {
    return failures.filter(f => 
      f.circuitBreakerState === 'open' || f.failureType.includes('CircuitBreaker')
    ).length;
  }

  private calculateRetrySuccessRate(failures: FailureMetric[]): number {
    const failuresWithRetries = failures.filter(f => f.retryAttempts > 0);
    if (failuresWithRetries.length === 0) return 100;

    // Count failures that succeeded after retries (fewer subsequent failures)
    const retriesSucceeded = failuresWithRetries.filter(f => f.retryAttempts > 1);
    return (retriesSucceeded.length / failuresWithRetries.length) * 100;
  }

  private getMostCommonFailures(failures: FailureMetric[]): Array<{ type: string; count: number; percentage: number }> {
    const failuresByType = this.groupFailuresByType(failures);
    const total = failures.length;
    
    return Object.entries(failuresByType)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateTimeToRecovery(failures: FailureMetric[]): {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const recoveryTimes = failures
      .filter(f => f.recoveryStrategy)
      .map(f => f.duration);

    if (recoveryTimes.length === 0) {
      return { average: 0, p50: 0, p95: 0, p99: 0 };
    }

    recoveryTimes.sort((a, b) => a - b);
    
    const average = recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length;
    const p50 = recoveryTimes[Math.floor(recoveryTimes.length * 0.5)];
    const p95 = recoveryTimes[Math.floor(recoveryTimes.length * 0.95)];
    const p99 = recoveryTimes[Math.floor(recoveryTimes.length * 0.99)];

    return { average, p50, p95, p99 };
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export/Import for persistence
  exportData(): {
    failures: FailureMetric[];
    alerts: Alert[];
    alertConditions: AlertCondition[];
  } {
    return {
      failures: [...this.failures],
      alerts: [...this.alerts],
      alertConditions: [...this.alertConditions]
    };
  }

  importData(data: {
    failures?: FailureMetric[];
    alerts?: Alert[];
    alertConditions?: AlertCondition[];
  }): void {
    if (data.failures) {
      this.failures = data.failures;
    }
    if (data.alerts) {
      this.alerts = data.alerts;
    }
    if (data.alertConditions) {
      this.alertConditions = data.alertConditions;
    }
  }

  destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
  }
}

interface MonitoringConfig {
  maxFailureHistory: number;
  metricsWindowMs: number;
  alertingEnabled: boolean;
  alertCooldownMs: number;
  enableAutoCleanup: boolean;
  cleanupIntervalMs: number;
  enableRealtimeMonitoring: boolean;
  monitoringIntervalMs: number;
}

// Singleton instance for global monitoring
export const globalFailureMonitoring = new FailureMonitoringService();

// React hook for monitoring
export function useFailureMonitoring() {
  const [metrics, setMetrics] = React.useState<ResilienceMetrics | null>(null);
  const [recentFailures, setRecentFailures] = React.useState<FailureMetric[]>([]);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);

  const refreshData = React.useCallback(() => {
    setMetrics(globalFailureMonitoring.getMetrics());
    setRecentFailures(globalFailureMonitoring.getRecentFailures(20));
    setAlerts(globalFailureMonitoring.getAlerts());
  }, []);

  React.useEffect(() => {
    refreshData();
    
    // Subscribe to new alerts
    const unsubscribe = globalFailureMonitoring.subscribe(() => {
      refreshData();
    });

    // Set up periodic refresh
    const interval = setInterval(refreshData, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshData]);

  const recordFailure = React.useCallback((failure: Omit<FailureMetric, 'id' | 'timestamp'>) => {
    globalFailureMonitoring.recordFailure(failure);
    refreshData();
  }, [refreshData]);

  const acknowledgeAlert = React.useCallback((alertId: string) => {
    globalFailureMonitoring.acknowledgeAlert(alertId);
    refreshData();
  }, [refreshData]);

  return {
    metrics,
    recentFailures,
    alerts,
    recordFailure,
    acknowledgeAlert,
    refreshData
  };
}

import React from 'react';