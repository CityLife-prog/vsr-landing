/**
 * Alerting and Notification System
 * Comprehensive alerting with multiple channels, escalation, and intelligent deduplication
 */

import { observability, TraceContext } from './ObservabilityCore';
import { logger } from './Logger';
import { metricsCollector } from './MetricsCollector';
import { distributedTracing } from './DistributedTracing';
import { performanceMonitoring, PerformanceAlert } from './PerformanceMonitoring';
import { resilienceObservability } from './ResilienceIntegration';

export interface AlertConfig {
  enableAlerting: boolean;
  enableDeduplication: boolean;
  deduplicationWindow: number; // milliseconds
  escalationDelays: number[]; // escalation delays in milliseconds
  defaultSeverityThresholds: SeverityThresholds;
  channels: AlertChannel[];
  rules: AlertRule[];
  suppressionRules: SuppressionRule[];
}

export interface SeverityThresholds {
  low: { errorRate: number; responseTime: number; memoryUsage: number };
  medium: { errorRate: number; responseTime: number; memoryUsage: number };
  high: { errorRate: number; responseTime: number; memoryUsage: number };
  critical: { errorRate: number; responseTime: number; memoryUsage: number };
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty' | 'console';
  enabled: boolean;
  config: Record<string, any>;
  severityFilter: AlertSeverity[];
  rateLimit?: { maxAlerts: number; windowMs: number };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  channels: string[]; // channel IDs
  cooldownPeriod: number; // milliseconds before same alert can fire again
  escalation?: EscalationRule;
  metadata?: Record<string, any>;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'change_rate';
  threshold: number;
  timeWindow: number; // milliseconds
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'rate';
  tags?: Record<string, string>;
}

export interface EscalationRule {
  levels: EscalationLevel[];
  maxEscalations: number;
}

export interface EscalationLevel {
  delay: number; // milliseconds
  channels: string[];
  severity?: AlertSeverity;
}

export interface SuppressionRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: SuppressionCondition[];
  duration: number; // milliseconds
  reason: string;
}

export interface SuppressionCondition {
  field: 'metric' | 'component' | 'operation' | 'severity' | 'channel';
  operator: 'eq' | 'contains' | 'regex';
  value: string;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  component?: string;
  operation?: string;
  context?: TraceContext;
  metadata: Record<string, any>;
  timestamp: number;
  status: 'firing' | 'resolved' | 'suppressed' | 'escalated';
  acknowledgments: Acknowledgment[];
  escalationLevel: number;
  fingerprint: string; // for deduplication
}

export interface Acknowledgment {
  userId: string;
  timestamp: number;
  comment?: string;
}

export interface AlertNotification {
  alert: Alert;
  channel: AlertChannel;
  timestamp: number;
  status: 'pending' | 'sent' | 'failed' | 'suppressed';
  attempts: number;
  error?: string;
}

export class AlertingSystem {
  private config: AlertConfig;
  private activeAlerts = new Map<string, Alert>();
  private alertHistory: Alert[] = [];
  private notifications: AlertNotification[] = [];
  private suppressions = new Map<string, number>(); // fingerprint -> suppression end time
  private rateLimits = new Map<string, { count: number; windowStart: number }>();
  private escalationTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = {
      enableAlerting: true,
      enableDeduplication: true,
      deduplicationWindow: 300000, // 5 minutes
      escalationDelays: [300000, 900000, 1800000], // 5min, 15min, 30min
      defaultSeverityThresholds: {
        low: { errorRate: 1, responseTime: 1000, memoryUsage: 70 },
        medium: { errorRate: 5, responseTime: 2000, memoryUsage: 80 },
        high: { errorRate: 10, responseTime: 5000, memoryUsage: 90 },
        critical: { errorRate: 25, responseTime: 10000, memoryUsage: 95 }
      },
      channels: [
        {
          id: 'console',
          type: 'console',
          enabled: true,
          config: {},
          severityFilter: ['low', 'medium', 'high', 'critical']
        }
      ],
      rules: [],
      suppressionRules: [],
      ...config
    };

    this.initializeAlertingSystem();
  }

  // Alert rule management
  addAlertRule(rule: AlertRule): void {
    const existingIndex = this.config.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.config.rules[existingIndex] = rule;
    } else {
      this.config.rules.push(rule);
    }

    logger.info(`Alert rule ${rule.enabled ? 'added' : 'disabled'}: ${rule.name}`, {
      rule_id: rule.id,
      severity: rule.severity,
      conditions: rule.conditions.length,
      component: 'alerting_system'
    });
  }

  removeAlertRule(ruleId: string): void {
    this.config.rules = this.config.rules.filter(r => r.id !== ruleId);
    logger.info(`Alert rule removed: ${ruleId}`, {
      rule_id: ruleId,
      component: 'alerting_system'
    });
  }

  // Alert channel management
  addAlertChannel(channel: AlertChannel): void {
    const existingIndex = this.config.channels.findIndex(c => c.id === channel.id);
    if (existingIndex >= 0) {
      this.config.channels[existingIndex] = channel;
    } else {
      this.config.channels.push(channel);
    }

    logger.info(`Alert channel ${channel.enabled ? 'added' : 'disabled'}: ${channel.id}`, {
      channel_id: channel.id,
      type: channel.type,
      severity_filter: channel.severityFilter,
      component: 'alerting_system'
    });
  }

  // Alert creation and management
  createAlert(
    ruleId: string,
    title: string,
    description: string,
    metric: string,
    value: number,
    threshold: number,
    severity: AlertSeverity,
    metadata: Record<string, any> = {},
    context?: TraceContext
  ): Alert {
    const rule = this.config.rules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId,
      ruleName: rule.name,
      severity,
      title,
      description,
      metric,
      value,
      threshold,
      component: metadata.component,
      operation: metadata.operation,
      context,
      metadata,
      timestamp: Date.now(),
      status: 'firing',
      acknowledgments: [],
      escalationLevel: 0,
      fingerprint: this.generateFingerprint(ruleId, metric, metadata)
    };

    // Check for deduplication
    if (this.config.enableDeduplication && this.isDuplicate(alert)) {
      logger.debug(`Alert deduplicated: ${alert.title}`, {
        alert_id: alert.id,
        fingerprint: alert.fingerprint,
        component: 'alerting_system'
      });
      return alert;
    }

    // Check suppression rules
    if (this.isSuppressed(alert)) {
      alert.status = 'suppressed';
      logger.debug(`Alert suppressed: ${alert.title}`, {
        alert_id: alert.id,
        component: 'alerting_system'
      });
      return alert;
    }

    // Store active alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Record metrics
    metricsCollector.recordCounter('alerts.created', 1, {
      severity: alert.severity,
      rule_id: alert.ruleId,
      metric: alert.metric,
      component: alert.component || 'unknown'
    });

    // Send notifications
    this.sendAlertNotifications(alert);

    // Schedule escalation if configured
    if (rule.escalation) {
      this.scheduleEscalation(alert);
    }

    logger.warn(`Alert created: ${alert.title}`, {
      alert_id: alert.id,
      rule_id: alert.ruleId,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      component: alert.component,
      operation: alert.operation
    });

    return alert;
  }

  // Resolve alert
  resolveAlert(alertId: string, userId?: string, comment?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      logger.warn(`Attempted to resolve non-existent alert: ${alertId}`, {
        alert_id: alertId,
        component: 'alerting_system'
      });
      return;
    }

    alert.status = 'resolved';
    if (userId) {
      alert.acknowledgments.push({
        userId,
        timestamp: Date.now(),
        comment
      });
    }

    // Clear escalation timer
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    // Record metrics
    metricsCollector.recordCounter('alerts.resolved', 1, {
      severity: alert.severity,
      rule_id: alert.ruleId,
      metric: alert.metric,
      duration_minutes: Math.round((Date.now() - alert.timestamp) / 60000).toString()
    });

    // Send resolution notifications
    this.sendResolutionNotifications(alert);

    logger.info(`Alert resolved: ${alert.title}`, {
      alert_id: alert.id,
      duration_ms: Date.now() - alert.timestamp,
      resolved_by: userId,
      comment,
      component: 'alerting_system'
    });
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string, userId: string, comment?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.acknowledgments.push({
      userId,
      timestamp: Date.now(),
      comment
    });

    // Cancel escalation if this is the first acknowledgment
    if (alert.acknowledgments.length === 1) {
      const escalationTimer = this.escalationTimers.get(alertId);
      if (escalationTimer) {
        clearTimeout(escalationTimer);
        this.escalationTimers.delete(alertId);
      }
    }

    metricsCollector.recordCounter('alerts.acknowledged', 1, {
      severity: alert.severity,
      rule_id: alert.ruleId
    });

    logger.info(`Alert acknowledged: ${alert.title}`, {
      alert_id: alert.id,
      acknowledged_by: userId,
      comment,
      component: 'alerting_system'
    });
  }

  // Snooze alert
  snoozeAlert(alertId: string, duration: number, userId: string, reason?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    const snoozeEnd = Date.now() + duration;
    this.suppressions.set(alert.fingerprint, snoozeEnd);

    logger.info(`Alert snoozed: ${alert.title}`, {
      alert_id: alert.id,
      duration_minutes: Math.round(duration / 60000),
      snoozed_by: userId,
      reason,
      component: 'alerting_system'
    });
  }

  // Metric evaluation and alerting
  evaluateMetrics(): void {
    if (!this.config.enableAlerting) return;

    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      try {
        this.evaluateRule(rule);
      } catch (error) {
        logger.error(`Failed to evaluate alert rule: ${rule.name}`, error as Error, {
          rule_id: rule.id,
          component: 'alerting_system'
        });
      }
    }
  }

  // Built-in alert rules
  setupDefaultAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Error rate exceeded threshold',
      enabled: true,
      conditions: [{
        metric: 'errors.total',
        operator: 'gt',
        threshold: 10,
        timeWindow: 300000, // 5 minutes
        aggregation: 'rate'
      }],
      severity: 'high',
      channels: ['console'],
      cooldownPeriod: 600000 // 10 minutes
    });

    // High response time alert
    this.addAlertRule({
      id: 'high_response_time',
      name: 'High Response Time',
      description: 'Average response time exceeded threshold',
      enabled: true,
      conditions: [{
        metric: 'api.request.duration',
        operator: 'gt',
        threshold: 2000,
        timeWindow: 300000,
        aggregation: 'avg'
      }],
      severity: 'medium',
      channels: ['console'],
      cooldownPeriod: 300000 // 5 minutes
    });

    // High memory usage alert
    this.addAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      description: 'Memory usage exceeded threshold',
      enabled: true,
      conditions: [{
        metric: 'memory.heap_used',
        operator: 'gt',
        threshold: 1000000000, // 1GB
        timeWindow: 300000,
        aggregation: 'avg'
      }],
      severity: 'medium',
      channels: ['console'],
      cooldownPeriod: 600000
    });

    // Circuit breaker opened alert
    this.addAlertRule({
      id: 'circuit_breaker_opened',
      name: 'Circuit Breaker Opened',
      description: 'Circuit breaker has opened',
      enabled: true,
      conditions: [{
        metric: 'resilience.circuit_breaker.opened',
        operator: 'gt',
        threshold: 0,
        timeWindow: 60000, // 1 minute
        aggregation: 'sum'
      }],
      severity: 'high',
      channels: ['console'],
      cooldownPeriod: 300000
    });

    logger.info('Default alert rules configured', {
      rule_count: 4,
      component: 'alerting_system'
    });
  }

  // Get alert status
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  getAlertMetrics(): {
    activeAlerts: number;
    totalAlerts: number;
    alertsBySevertiy: Record<AlertSeverity, number>;
    avgResolutionTime: number;
    acknowledgedRate: number;
  } {
    const activeAlerts = this.activeAlerts.size;
    const totalAlerts = this.alertHistory.length;
    
    const alertsBySeverity = this.alertHistory.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<AlertSeverity, number>);

    const resolvedAlerts = this.alertHistory.filter(a => a.status === 'resolved');
    const avgResolutionTime = resolvedAlerts.length > 0 
      ? resolvedAlerts.reduce((sum, alert) => {
          const resolutionTime = (alert.acknowledgments[0]?.timestamp || Date.now()) - alert.timestamp;
          return sum + resolutionTime;
        }, 0) / resolvedAlerts.length
      : 0;

    const acknowledgedAlerts = this.alertHistory.filter(a => a.acknowledgments.length > 0);
    const acknowledgedRate = totalAlerts > 0 ? (acknowledgedAlerts.length / totalAlerts) * 100 : 0;

    return {
      activeAlerts,
      totalAlerts,
      alertsBySevertiy: alertsBySeverity,
      avgResolutionTime,
      acknowledgedRate
    };
  }

  // Private methods
  private evaluateRule(rule: AlertRule): void {
    // Check cooldown period
    const lastAlert = this.alertHistory
      .filter(a => a.ruleId === rule.id)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastAlert && Date.now() - lastAlert.timestamp < rule.cooldownPeriod) {
      return;
    }

    // Evaluate conditions
    for (const condition of rule.conditions) {
      const violatesCondition = this.evaluateCondition(condition);
      
      if (violatesCondition) {
        const { value, threshold } = violatesCondition;
        
        this.createAlert(
          rule.id,
          rule.name,
          rule.description,
          condition.metric,
          value,
          threshold,
          rule.severity,
          { rule: rule.name, condition: condition.metric }
        );
        break; // Only create one alert per rule evaluation
      }
    }
  }

  private evaluateCondition(condition: AlertCondition): { value: number; threshold: number } | null {
    // Get metric values for the time window
    const timeRange = {
      start: Date.now() - condition.timeWindow,
      end: Date.now()
    };

    const metricValues = metricsCollector.getMetricValues(
      condition.metric,
      condition.tags || {},
      timeRange
    );

    if (metricValues.length === 0) return null;

    // Apply aggregation
    let aggregatedValue: number;
    const values = metricValues.map(v => v.value);

    switch (condition.aggregation) {
      case 'avg':
        aggregatedValue = values.reduce((sum, v) => sum + v, 0) / values.length;
        break;
      case 'sum':
        aggregatedValue = values.reduce((sum, v) => sum + v, 0);
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      case 'rate':
        // Calculate rate per second
        const timeSpanSeconds = condition.timeWindow / 1000;
        aggregatedValue = values.reduce((sum, v) => sum + v, 0) / timeSpanSeconds;
        break;
      default:
        aggregatedValue = values[values.length - 1]; // latest value
    }

    // Check condition
    const violates = this.checkCondition(aggregatedValue, condition.operator, condition.threshold);
    
    return violates ? { value: aggregatedValue, threshold: condition.threshold } : null;
  }

  private checkCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private isDuplicate(alert: Alert): boolean {
    const now = Date.now();
    const window = this.config.deduplicationWindow;

    return this.alertHistory.some(existingAlert => 
      existingAlert.fingerprint === alert.fingerprint &&
      now - existingAlert.timestamp < window &&
      existingAlert.status === 'firing'
    );
  }

  private isSuppressed(alert: Alert): boolean {
    const suppressionEnd = this.suppressions.get(alert.fingerprint);
    if (suppressionEnd && Date.now() < suppressionEnd) {
      return true;
    }

    // Check suppression rules
    return this.config.suppressionRules.some(rule => {
      if (!rule.enabled) return false;
      
      return rule.conditions.every(condition => {
        const fieldValue = this.getAlertFieldValue(alert, condition.field);
        return this.matchesCondition(fieldValue, condition.operator, condition.value);
      });
    });
  }

  private getAlertFieldValue(alert: Alert, field: string): string {
    switch (field) {
      case 'metric': return alert.metric;
      case 'component': return alert.component || '';
      case 'operation': return alert.operation || '';
      case 'severity': return alert.severity;
      default: return '';
    }
  }

  private matchesCondition(value: string, operator: string, pattern: string): boolean {
    switch (operator) {
      case 'eq': return value === pattern;
      case 'contains': return value.includes(pattern);
      case 'regex': return new RegExp(pattern).test(value);
      default: return false;
    }
  }

  private sendAlertNotifications(alert: Alert): void {
    const rule = this.config.rules.find(r => r.id === alert.ruleId);
    if (!rule) return;

    for (const channelId of rule.channels) {
      const channel = this.config.channels.find(c => c.id === channelId);
      if (!channel || !channel.enabled) continue;

      // Check severity filter
      if (!channel.severityFilter.includes(alert.severity)) continue;

      // Check rate limiting
      if (channel.rateLimit && this.isRateLimited(channel)) continue;

      const notification: AlertNotification = {
        alert,
        channel,
        timestamp: Date.now(),
        status: 'pending',
        attempts: 0
      };

      this.sendNotification(notification);
    }
  }

  private sendResolutionNotifications(alert: Alert): void {
    // Send resolution notifications through same channels as original alert
    for (const notification of this.notifications) {
      if (notification.alert.id === alert.id && notification.status === 'sent') {
        this.sendResolutionNotification(alert, notification.channel);
      }
    }
  }

  private sendNotification(notification: AlertNotification): void {
    notification.attempts++;
    
    try {
      switch (notification.channel.type) {
        case 'console':
          this.sendConsoleNotification(notification);
          break;
        case 'email':
          this.sendEmailNotification(notification);
          break;
        case 'slack':
          this.sendSlackNotification(notification);
          break;
        case 'webhook':
          this.sendWebhookNotification(notification);
          break;
        default:
          throw new Error(`Unsupported channel type: ${notification.channel.type}`);
      }
      
      notification.status = 'sent';
      this.notifications.push(notification);
      
      metricsCollector.recordCounter('alerts.notifications.sent', 1, {
        channel: notification.channel.id,
        type: notification.channel.type,
        severity: notification.alert.severity
      });
      
    } catch (error) {
      notification.status = 'failed';
      notification.error = error instanceof Error ? error.message : String(error);
      this.notifications.push(notification);
      
      metricsCollector.recordCounter('alerts.notifications.failed', 1, {
        channel: notification.channel.id,
        type: notification.channel.type,
        error: notification.error
      });
      
      logger.error(`Failed to send alert notification`, error as Error, {
        alert_id: notification.alert.id,
        channel_id: notification.channel.id,
        channel_type: notification.channel.type,
        component: 'alerting_system'
      });
    }
  }

  private sendConsoleNotification(notification: AlertNotification): void {
    const alert = notification.alert;
    const emoji = this.getSeverityEmoji(alert.severity);
    
    console.log(`\n${emoji} ALERT: ${alert.title}`);
    console.log(`Severity: ${alert.severity.toUpperCase()}`);
    console.log(`Metric: ${alert.metric}`);
    console.log(`Value: ${alert.value} (threshold: ${alert.threshold})`);
    console.log(`Component: ${alert.component || 'unknown'}`);
    console.log(`Time: ${new Date(alert.timestamp).toISOString()}`);
    console.log(`Description: ${alert.description}\n`);
  }

  private sendEmailNotification(notification: AlertNotification): void {
    // Email implementation would go here
    logger.info('Email notification would be sent', {
      alert_id: notification.alert.id,
      recipient: notification.channel.config.recipient,
      component: 'alerting_system'
    });
  }

  private sendSlackNotification(notification: AlertNotification): void {
    // Slack implementation would go here
    logger.info('Slack notification would be sent', {
      alert_id: notification.alert.id,
      webhook: notification.channel.config.webhook,
      component: 'alerting_system'
    });
  }

  private sendWebhookNotification(notification: AlertNotification): void {
    // Webhook implementation would go here
    logger.info('Webhook notification would be sent', {
      alert_id: notification.alert.id,
      url: notification.channel.config.url,
      component: 'alerting_system'
    });
  }

  private sendResolutionNotification(alert: Alert, channel: AlertChannel): void {
    if (channel.type === 'console') {
      console.log(`\n✅ RESOLVED: ${alert.title}`);
      console.log(`Duration: ${Math.round((Date.now() - alert.timestamp) / 60000)} minutes\n`);
    }
  }

  private isRateLimited(channel: AlertChannel): boolean {
    if (!channel.rateLimit) return false;
    
    const now = Date.now();
    const windowStart = now - channel.rateLimit.windowMs;
    const key = channel.id;
    
    let rateLimit = this.rateLimits.get(key);
    if (!rateLimit || rateLimit.windowStart < windowStart) {
      rateLimit = { count: 0, windowStart: now };
      this.rateLimits.set(key, rateLimit);
    }
    
    if (rateLimit.count >= channel.rateLimit.maxAlerts) {
      return true;
    }
    
    rateLimit.count++;
    return false;
  }

  private scheduleEscalation(alert: Alert): void {
    const rule = this.config.rules.find(r => r.id === alert.ruleId);
    if (!rule?.escalation) return;

    const escalationLevel = alert.escalationLevel;
    const escalation = rule.escalation.levels[escalationLevel];
    
    if (!escalation || escalationLevel >= rule.escalation.maxEscalations) return;

    const timer = setTimeout(() => {
      // Check if alert is still active and not acknowledged
      const currentAlert = this.activeAlerts.get(alert.id);
      if (currentAlert && currentAlert.acknowledgments.length === 0) {
        this.escalateAlert(alert);
      }
    }, escalation.delay);

    this.escalationTimers.set(alert.id, timer);
  }

  private escalateAlert(alert: Alert): void {
    const rule = this.config.rules.find(r => r.id === alert.ruleId);
    if (!rule?.escalation) return;

    alert.escalationLevel++;
    alert.status = 'escalated';
    
    const escalation = rule.escalation.levels[alert.escalationLevel - 1];
    if (!escalation) return;

    // Send escalation notifications
    for (const channelId of escalation.channels) {
      const channel = this.config.channels.find(c => c.id === channelId);
      if (channel) {
        const notification: AlertNotification = {
          alert: { ...alert, severity: escalation.severity || alert.severity },
          channel,
          timestamp: Date.now(),
          status: 'pending',
          attempts: 0
        };
        this.sendNotification(notification);
      }
    }

    metricsCollector.recordCounter('alerts.escalated', 1, {
      rule_id: alert.ruleId,
      escalation_level: alert.escalationLevel.toString()
    });

    logger.warn(`Alert escalated: ${alert.title}`, {
      alert_id: alert.id,
      escalation_level: alert.escalationLevel,
      component: 'alerting_system'
    });

    // Schedule next escalation if available
    this.scheduleEscalation(alert);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(ruleId: string, metric: string, metadata: Record<string, any>): string {
    const key = `${ruleId}:${metric}:${metadata.component || ''}:${metadata.operation || ''}`;
    return Buffer.from(key).toString('base64').substr(0, 16);
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'low': return '🟡';
      case 'medium': return '🟠';
      case 'high': return '🔴';
      case 'critical': return '🚨';
      default: return '⚪';
    }
  }

  private initializeAlertingSystem(): void {
    // Set up metric evaluation interval
    setInterval(() => {
      this.evaluateMetrics();
    }, 60000); // Every minute

    // Set up cleanup interval
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // Every hour

    // Set up default rules if none exist
    if (this.config.rules.length === 0) {
      this.setupDefaultAlertRules();
    }

    // Subscribe to performance alerts
    performanceMonitoring.onAlert((perfAlert: PerformanceAlert) => {
      this.createAlert(
        'performance_alert',
        `Performance Alert: ${perfAlert.metric}`,
        `${perfAlert.type} detected for ${perfAlert.metric}`,
        perfAlert.metric,
        perfAlert.value,
        perfAlert.threshold,
        perfAlert.severity,
        {
          type: perfAlert.type,
          operation: perfAlert.operation,
          component: perfAlert.component
        },
        perfAlert.context
      );
    });

    logger.info('Alerting system initialized', {
      enable_alerting: this.config.enableAlerting,
      enable_deduplication: this.config.enableDeduplication,
      channels: this.config.channels.length,
      rules: this.config.rules.length,
      component: 'alerting_system'
    });
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - 86400000 * 7; // 7 days

    // Clean up alert history
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);

    // Clean up notifications
    this.notifications = this.notifications.filter(notification => notification.timestamp > cutoff);

    // Clean up expired suppressions
    for (const [fingerprint, endTime] of this.suppressions.entries()) {
      if (Date.now() > endTime) {
        this.suppressions.delete(fingerprint);
      }
    }

    logger.debug('Alert system cleanup completed', {
      alert_history_count: this.alertHistory.length,
      notification_count: this.notifications.length,
      suppression_count: this.suppressions.size,
      component: 'alerting_system'
    });
  }

  // Cleanup
  destroy(): void {
    // Clear all timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }

    // Clear data
    this.activeAlerts.clear();
    this.alertHistory.length = 0;
    this.notifications.length = 0;
    this.suppressions.clear();
    this.rateLimits.clear();
    this.escalationTimers.clear();

    logger.info('Alerting system destroyed', {
      component: 'alerting_system'
    });
  }
}

// Global instance
export const alertingSystem = new AlertingSystem();

// Types are already exported above in their definitions