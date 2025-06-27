/**
 * Error Reporting and Alerting System - Resilience Layer
 * Comprehensive error reporting with multiple channels and intelligent alerting
 */

export enum ReportingChannel {
  CONSOLE = 'console',
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  DATABASE = 'database',
  FILE = 'file',
  SENTRY = 'sentry',
  DATADOG = 'datadog',
  NEWRELIC = 'newrelic'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  level: AlertSeverity;
  title: string;
  message: string;
  error?: Error;
  context: {
    operationName?: string;
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    userAgent?: string;
    ipAddress?: string;
    url?: string;
    component?: string;
    environment: string;
  };
  metadata: Record<string, any>;
  stackTrace?: string;
  fingerprint?: string; // For deduplication
  tags: string[];
  attempts: number;
  channels: ReportingChannel[];
}

export interface ReportingChannelConfig {
  channel: ReportingChannel;
  enabled: boolean;
  config: Record<string, any>;
  minSeverity: AlertSeverity;
  maxReportsPerHour?: number;
  filters?: Array<(report: ErrorReport) => boolean>;
}

export interface AlertingRule {
  id: string;
  name: string;
  description: string;
  condition: (report: ErrorReport, recentReports: ErrorReport[]) => boolean;
  severity: AlertSeverity;
  channels: ReportingChannel[];
  throttleMs: number;
  enabled: boolean;
  metadata: Record<string, any>;
}

export interface ReportingMetrics {
  totalReports: number;
  reportsByChannel: Record<ReportingChannel, number>;
  reportsBySeverity: Record<AlertSeverity, number>;
  reportsByOperation: Record<string, number>;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliverySuccessRate: number;
  averageDeliveryTime: number;
  throttledReports: number;
  deduplicatedReports: number;
}

export class ErrorReportingService {
  private reports: ErrorReport[] = [];
  private channelConfigs: Map<ReportingChannel, ReportingChannelConfig> = new Map();
  private alertingRules: Map<string, AlertingRule> = new Map();
  private reportingMetrics: ReportingMetrics;
  private throttleMap = new Map<string, number>();
  private deliveryQueue: ErrorReport[] = [];
  private isProcessingQueue = false;
  private config: ErrorReportingConfig;

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      maxReportHistory: 10000,
      enableDeduplication: true,
      deduplicationWindow: 300000, // 5 minutes
      enableThrottling: true,
      queueProcessingInterval: 5000,
      enableRetryFailedDeliveries: true,
      maxDeliveryRetries: 3,
      deliveryTimeout: 30000,
      environment: 'production',
      ...config
    };

    this.reportingMetrics = {
      totalReports: 0,
      reportsByChannel: {} as Record<ReportingChannel, number>,
      reportsBySeverity: {} as Record<AlertSeverity, number>,
      reportsByOperation: {},
      successfulDeliveries: 0,
      failedDeliveries: 0,
      deliverySuccessRate: 100,
      averageDeliveryTime: 0,
      throttledReports: 0,
      deduplicatedReports: 0
    };

    this.setupDefaultChannels();
    this.setupDefaultAlertingRules();
    this.startQueueProcessor();
  }

  async reportError(
    error: Error | string,
    context: Partial<ErrorReport['context']> = {},
    metadata: Record<string, any> = {},
    severity: AlertSeverity = AlertSeverity.MEDIUM
  ): Promise<string> {
    const report: ErrorReport = {
      id: this.generateId(),
      timestamp: new Date(),
      level: severity,
      title: error instanceof Error ? error.message : String(error),
      message: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error : undefined,
      context: {
        environment: this.config.environment,
        ...context
      },
      metadata,
      stackTrace: error instanceof Error ? error.stack : undefined,
      fingerprint: this.generateFingerprint(error, context),
      tags: this.generateTags(error, context, metadata),
      attempts: 0,
      channels: this.selectChannelsForSeverity(severity)
    };

    // Check for deduplication
    if (this.config.enableDeduplication && this.isDuplicate(report)) {
      this.reportingMetrics.deduplicatedReports++;
      return report.id;
    }

    // Check throttling
    if (this.config.enableThrottling && this.isThrottled(report)) {
      this.reportingMetrics.throttledReports++;
      return report.id;
    }

    // Store the report
    this.reports.push(report);
    this.trimReportHistory();

    // Update metrics
    this.updateMetrics(report);

    // Queue for delivery
    this.deliveryQueue.push(report);

    // Apply alerting rules
    this.applyAlertingRules(report);

    console.error(`Error reported [${severity}]: ${report.title}`, report);
    
    return report.id;
  }

  async reportCritical(
    error: Error | string,
    context?: Partial<ErrorReport['context']>,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.reportError(error, context, metadata, AlertSeverity.CRITICAL);
  }

  async reportHigh(
    error: Error | string,
    context?: Partial<ErrorReport['context']>,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.reportError(error, context, metadata, AlertSeverity.HIGH);
  }

  async reportMedium(
    error: Error | string,
    context?: Partial<ErrorReport['context']>,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.reportError(error, context, metadata, AlertSeverity.MEDIUM);
  }

  async reportLow(
    error: Error | string,
    context?: Partial<ErrorReport['context']>,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.reportError(error, context, metadata, AlertSeverity.LOW);
  }

  // Channel management
  configureChannel(config: ReportingChannelConfig): void {
    this.channelConfigs.set(config.channel, config);
  }

  enableChannel(channel: ReportingChannel): void {
    const config = this.channelConfigs.get(channel);
    if (config) {
      config.enabled = true;
    }
  }

  disableChannel(channel: ReportingChannel): void {
    const config = this.channelConfigs.get(channel);
    if (config) {
      config.enabled = false;
    }
  }

  // Alerting rules management
  addAlertingRule(rule: Omit<AlertingRule, 'id'>): string {
    const ruleWithId: AlertingRule = {
      id: this.generateId(),
      ...rule
    };
    
    this.alertingRules.set(ruleWithId.id, ruleWithId);
    return ruleWithId.id;
  }

  removeAlertingRule(ruleId: string): boolean {
    return this.alertingRules.delete(ruleId);
  }

  getAlertingRules(): AlertingRule[] {
    return Array.from(this.alertingRules.values());
  }

  // Query methods
  getReports(filters?: {
    severity?: AlertSeverity;
    operation?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): ErrorReport[] {
    let filteredReports = [...this.reports];

    if (filters?.severity) {
      filteredReports = filteredReports.filter(r => r.level === filters.severity);
    }

    if (filters?.operation) {
      filteredReports = filteredReports.filter(r => 
        r.context.operationName === filters.operation
      );
    }

    if (filters?.timeRange) {
      filteredReports = filteredReports.filter(r => 
        r.timestamp >= filters.timeRange!.start && 
        r.timestamp <= filters.timeRange!.end
      );
    }

    // Sort by timestamp (newest first)
    filteredReports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      filteredReports = filteredReports.slice(0, filters.limit);
    }

    return filteredReports;
  }

  getMetrics(): ReportingMetrics {
    return { ...this.reportingMetrics };
  }

  getReportById(id: string): ErrorReport | undefined {
    return this.reports.find(r => r.id === id);
  }

  // Private methods
  private setupDefaultChannels(): void {
    // Console channel (always enabled)
    this.configureChannel({
      channel: ReportingChannel.CONSOLE,
      enabled: true,
      config: { colorized: true },
      minSeverity: AlertSeverity.LOW
    });

    // Database channel for persistence
    this.configureChannel({
      channel: ReportingChannel.DATABASE,
      enabled: false, // Enable when database is configured
      config: { table: 'error_reports' },
      minSeverity: AlertSeverity.MEDIUM
    });

    // Webhook channel for external integrations
    this.configureChannel({
      channel: ReportingChannel.WEBHOOK,
      enabled: false, // Configure webhook URL to enable
      config: { url: '', method: 'POST', timeout: 10000 },
      minSeverity: AlertSeverity.HIGH
    });

    // Email channel for critical alerts
    this.configureChannel({
      channel: ReportingChannel.EMAIL,
      enabled: false, // Configure SMTP to enable
      config: { 
        smtp: '', 
        to: [], 
        subject: 'Critical Error Alert - VSR Landing' 
      },
      minSeverity: AlertSeverity.CRITICAL,
      maxReportsPerHour: 10
    });
  }

  private setupDefaultAlertingRules(): void {
    // Critical error spike rule
    this.addAlertingRule({
      name: 'Critical Error Spike',
      description: 'More than 5 critical errors in 10 minutes',
      condition: (report, recentReports) => {
        if (report.level !== AlertSeverity.CRITICAL) return false;
        
        const tenMinutesAgo = new Date(Date.now() - 600000);
        const recentCriticalErrors = recentReports.filter(r => 
          r.level === AlertSeverity.CRITICAL && 
          r.timestamp >= tenMinutesAgo
        );
        
        return recentCriticalErrors.length >= 5;
      },
      severity: AlertSeverity.CRITICAL,
      channels: [ReportingChannel.EMAIL, ReportingChannel.WEBHOOK],
      throttleMs: 1800000, // 30 minutes
      enabled: true,
      metadata: {}
    });

    // Operation failure pattern rule
    this.addAlertingRule({
      name: 'Operation Failure Pattern',
      description: 'Same operation failing repeatedly',
      condition: (report, recentReports) => {
        if (!report.context.operationName) return false;
        
        const fiveMinutesAgo = new Date(Date.now() - 300000);
        const sameOperationErrors = recentReports.filter(r => 
          r.context.operationName === report.context.operationName && 
          r.timestamp >= fiveMinutesAgo
        );
        
        return sameOperationErrors.length >= 3;
      },
      severity: AlertSeverity.HIGH,
      channels: [ReportingChannel.WEBHOOK],
      throttleMs: 900000, // 15 minutes
      enabled: true,
      metadata: {}
    });

    // High error rate rule
    this.addAlertingRule({
      name: 'High Error Rate',
      description: 'More than 20 errors in 5 minutes',
      condition: (report, recentReports) => {
        const fiveMinutesAgo = new Date(Date.now() - 300000);
        const recentErrors = recentReports.filter(r => r.timestamp >= fiveMinutesAgo);
        return recentErrors.length >= 20;
      },
      severity: AlertSeverity.HIGH,
      channels: [ReportingChannel.EMAIL, ReportingChannel.WEBHOOK],
      throttleMs: 600000, // 10 minutes
      enabled: true,
      metadata: {}
    });
  }

  private isDuplicate(report: ErrorReport): boolean {
    const windowStart = new Date(Date.now() - this.config.deduplicationWindow);
    const recentReports = this.reports.filter(r => r.timestamp >= windowStart);
    
    return recentReports.some(r => 
      r.fingerprint === report.fingerprint && 
      r.level === report.level
    );
  }

  private isThrottled(report: ErrorReport): boolean {
    const key = `${report.fingerprint}_${report.level}`;
    const lastReport = this.throttleMap.get(key) || 0;
    const now = Date.now();
    
    // Simple throttling: max 1 report per fingerprint per minute
    const throttleWindow = 60000;
    
    if (now - lastReport < throttleWindow) {
      return true;
    }
    
    this.throttleMap.set(key, now);
    return false;
  }

  private generateFingerprint(
    error: Error | string, 
    context: Partial<ErrorReport['context']>
  ): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const operation = context.operationName || 'unknown';
    const component = context.component || 'unknown';
    
    // Create a stable fingerprint for deduplication
    const fingerprint = `${operation}:${component}:${errorMessage}`;
    return this.hash(fingerprint);
  }

  private generateTags(
    error: Error | string,
    context: Partial<ErrorReport['context']>,
    metadata: Record<string, any>
  ): string[] {
    const tags: string[] = [];
    
    if (context.operationName) {
      tags.push(`operation:${context.operationName}`);
    }
    
    if (context.component) {
      tags.push(`component:${context.component}`);
    }
    
    if (context.environment) {
      tags.push(`env:${context.environment}`);
    }
    
    if (error instanceof Error) {
      tags.push(`error_type:${error.constructor.name}`);
    }
    
    // Add custom tags from metadata
    Object.keys(metadata).forEach(key => {
      if (typeof metadata[key] === 'string') {
        tags.push(`${key}:${metadata[key]}`);
      }
    });
    
    return tags;
  }

  private selectChannelsForSeverity(severity: AlertSeverity): ReportingChannel[] {
    const channels: ReportingChannel[] = [];
    
    for (const [channel, config] of this.channelConfigs) {
      if (config.enabled && this.isSeverityAllowed(severity, config.minSeverity)) {
        channels.push(channel);
      }
    }
    
    return channels;
  }

  private isSeverityAllowed(severity: AlertSeverity, minSeverity: AlertSeverity): boolean {
    const severityOrder = [
      AlertSeverity.LOW,
      AlertSeverity.MEDIUM,
      AlertSeverity.HIGH,
      AlertSeverity.CRITICAL
    ];
    
    const severityIndex = severityOrder.indexOf(severity);
    const minSeverityIndex = severityOrder.indexOf(minSeverity);
    
    return severityIndex >= minSeverityIndex;
  }

  private applyAlertingRules(report: ErrorReport): void {
    const recentReports = this.reports.slice(-100); // Check last 100 reports
    
    for (const rule of this.alertingRules.values()) {
      if (!rule.enabled) continue;
      
      try {
        if (rule.condition(report, recentReports)) {
          this.triggerAlert(rule, report);
        }
      } catch (error) {
        console.error(`Error applying alerting rule ${rule.name}:`, error);
      }
    }
  }

  private triggerAlert(rule: AlertingRule, report: ErrorReport): void {
    // Check throttling
    const throttleKey = `rule_${rule.id}`;
    const lastTriggered = this.throttleMap.get(throttleKey) || 0;
    
    if (Date.now() - lastTriggered < rule.throttleMs) {
      return; // Throttled
    }
    
    this.throttleMap.set(throttleKey, Date.now());
    
    // Create enhanced report for alert
    const alertReport: ErrorReport = {
      ...report,
      title: `ALERT: ${rule.name}`,
      message: `${rule.description}\n\nOriginal Error: ${report.message}`,
      level: rule.severity,
      channels: rule.channels,
      metadata: {
        ...report.metadata,
        alertRule: rule.name,
        isAlert: true
      }
    };
    
    // Queue the alert for delivery
    this.deliveryQueue.push(alertReport);
    
    console.warn(`Alert triggered: ${rule.name}`, alertReport);
  }

  private async startQueueProcessor(): Promise<void> {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.deliveryQueue.length > 0) {
        this.isProcessingQueue = true;
        await this.processDeliveryQueue();
        this.isProcessingQueue = false;
      }
    }, this.config.queueProcessingInterval);
  }

  private async processDeliveryQueue(): Promise<void> {
    const batch = this.deliveryQueue.splice(0, 10); // Process in batches of 10
    
    for (const report of batch) {
      for (const channel of report.channels) {
        try {
          await this.deliverToChannel(report, channel);
          this.reportingMetrics.successfulDeliveries++;
        } catch (error) {
          this.reportingMetrics.failedDeliveries++;
          console.error(`Failed to deliver report to ${channel}:`, error);
          
          // Retry logic
          if (this.config.enableRetryFailedDeliveries && report.attempts < this.config.maxDeliveryRetries) {
            report.attempts++;
            this.deliveryQueue.push(report); // Re-queue for retry
          }
        }
      }
    }
  }

  private async deliverToChannel(report: ErrorReport, channel: ReportingChannel): Promise<void> {
    const config = this.channelConfigs.get(channel);
    if (!config || !config.enabled) {
      throw new Error(`Channel ${channel} is not configured or disabled`);
    }

    const startTime = Date.now();
    
    try {
      switch (channel) {
        case ReportingChannel.CONSOLE:
          await this.deliverToConsole(report, config);
          break;
        case ReportingChannel.EMAIL:
          await this.deliverToEmail(report, config);
          break;
        case ReportingChannel.WEBHOOK:
          await this.deliverToWebhook(report, config);
          break;
        case ReportingChannel.DATABASE:
          await this.deliverToDatabase(report, config);
          break;
        case ReportingChannel.FILE:
          await this.deliverToFile(report, config);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
      
      // Update delivery time metrics
      const deliveryTime = Date.now() - startTime;
      this.reportingMetrics.averageDeliveryTime = 
        (this.reportingMetrics.averageDeliveryTime + deliveryTime) / 2;
        
    } catch (error) {
      console.error(`Delivery to ${channel} failed:`, error);
      throw error;
    }
  }

  private async deliverToConsole(report: ErrorReport, config: ReportingChannelConfig): Promise<void> {
    const severity = report.level.toUpperCase();
    const timestamp = report.timestamp.toISOString();
    const message = `[${timestamp}] ${severity}: ${report.title}`;
    
    switch (report.level) {
      case AlertSeverity.CRITICAL:
        console.error(`🚨 ${message}`, report);
        break;
      case AlertSeverity.HIGH:
        console.error(`❗ ${message}`, report);
        break;
      case AlertSeverity.MEDIUM:
        console.warn(`⚠️  ${message}`, report);
        break;
      case AlertSeverity.LOW:
        console.log(`ℹ️  ${message}`, report);
        break;
    }
  }

  private async deliverToEmail(report: ErrorReport, config: ReportingChannelConfig): Promise<void> {
    // Email delivery implementation would go here
    // For now, just log that it would be sent
    console.log(`📧 Would send email for: ${report.title}`);
  }

  private async deliverToWebhook(report: ErrorReport, config: ReportingChannelConfig): Promise<void> {
    // Webhook delivery implementation would go here
    // For now, just log that it would be sent
    console.log(`🔗 Would send webhook for: ${report.title}`);
  }

  private async deliverToDatabase(report: ErrorReport, config: ReportingChannelConfig): Promise<void> {
    // Database delivery implementation would go here
    // For now, just log that it would be stored
    console.log(`💾 Would store in database: ${report.title}`);
  }

  private async deliverToFile(report: ErrorReport, config: ReportingChannelConfig): Promise<void> {
    // File delivery implementation would go here
    // For now, just log that it would be written
    console.log(`📁 Would write to file: ${report.title}`);
  }

  private updateMetrics(report: ErrorReport): void {
    this.reportingMetrics.totalReports++;
    
    // Update by channel
    report.channels.forEach(channel => {
      this.reportingMetrics.reportsByChannel[channel] = 
        (this.reportingMetrics.reportsByChannel[channel] || 0) + 1;
    });
    
    // Update by severity
    this.reportingMetrics.reportsBySeverity[report.level] = 
      (this.reportingMetrics.reportsBySeverity[report.level] || 0) + 1;
    
    // Update by operation
    if (report.context.operationName) {
      this.reportingMetrics.reportsByOperation[report.context.operationName] = 
        (this.reportingMetrics.reportsByOperation[report.context.operationName] || 0) + 1;
    }
    
    // Update delivery success rate
    const totalDeliveries = this.reportingMetrics.successfulDeliveries + this.reportingMetrics.failedDeliveries;
    if (totalDeliveries > 0) {
      this.reportingMetrics.deliverySuccessRate = 
        (this.reportingMetrics.successfulDeliveries / totalDeliveries) * 100;
    }
  }

  private trimReportHistory(): void {
    if (this.reports.length > this.config.maxReportHistory) {
      this.reports = this.reports.slice(-this.config.maxReportHistory);
    }
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface ErrorReportingConfig {
  maxReportHistory: number;
  enableDeduplication: boolean;
  deduplicationWindow: number;
  enableThrottling: boolean;
  queueProcessingInterval: number;
  enableRetryFailedDeliveries: boolean;
  maxDeliveryRetries: number;
  deliveryTimeout: number;
  environment: string;
}

// Global error reporting instance
export const globalErrorReporting = new ErrorReportingService();

// React hook for error reporting
export function useErrorReporting() {
  const [reports, setReports] = React.useState<ErrorReport[]>([]);
  const [metrics, setMetrics] = React.useState<ReportingMetrics | null>(null);

  const refreshData = React.useCallback(() => {
    setReports(globalErrorReporting.getReports({ limit: 50 }));
    setMetrics(globalErrorReporting.getMetrics());
  }, []);

  React.useEffect(() => {
    refreshData();
    
    // Set up periodic refresh
    const interval = setInterval(refreshData, 30000);
    
    return () => clearInterval(interval);
  }, [refreshData]);

  const reportError = React.useCallback(async (
    error: Error | string,
    context?: Partial<ErrorReport['context']>,
    metadata?: Record<string, any>,
    severity?: AlertSeverity
  ) => {
    const id = await globalErrorReporting.reportError(error, context, metadata, severity);
    refreshData();
    return id;
  }, [refreshData]);

  return {
    reports,
    metrics,
    reportError,
    reportCritical: globalErrorReporting.reportCritical.bind(globalErrorReporting),
    reportHigh: globalErrorReporting.reportHigh.bind(globalErrorReporting),
    reportMedium: globalErrorReporting.reportMedium.bind(globalErrorReporting),
    reportLow: globalErrorReporting.reportLow.bind(globalErrorReporting),
    refreshData
  };
}

// Decorator for automatic error reporting
export function ReportErrors(
  severity: AlertSeverity = AlertSeverity.MEDIUM,
  context?: Partial<ErrorReport['context']>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        await globalErrorReporting.reportError(
          error as Error,
          {
            operationName: propertyName,
            component: target.constructor.name,
            ...context
          },
          { args },
          severity
        );
        throw error;
      }
    };

    return descriptor;
  };
}

import React from 'react';