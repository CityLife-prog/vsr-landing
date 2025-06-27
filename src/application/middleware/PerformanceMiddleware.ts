/**
 * Performance Monitoring Middleware - CQRS Infrastructure
 * Monitors command and query execution performance
 */

import { Command, CommandMiddleware } from '../cqrs/Command';

export interface PerformanceMetrics {
  commandName: string;
  executionTimeMs: number;
  timestamp: Date;
  success: boolean;
  memoryUsageMB?: number;
}

export interface PerformanceMonitor {
  recordMetric(metric: PerformanceMetrics): void;
  getAverageExecutionTime(commandName: string): number;
  getSlowCommands(thresholdMs: number): PerformanceMetrics[];
}

export class InMemoryPerformanceMonitor implements PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getAverageExecutionTime(commandName: string): number {
    const commandMetrics = this.metrics.filter(m => m.commandName === commandName);
    
    if (commandMetrics.length === 0) {
      return 0;
    }

    const total = commandMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0);
    return total / commandMetrics.length;
  }

  getSlowCommands(thresholdMs: number): PerformanceMetrics[] {
    return this.metrics.filter(m => m.executionTimeMs > thresholdMs);
  }

  getMetricsSummary(): Record<string, { count: number; avgTime: number; maxTime: number }> {
    const summary: Record<string, { count: number; totalTime: number; maxTime: number }> = {};

    for (const metric of this.metrics) {
      if (!summary[metric.commandName]) {
        summary[metric.commandName] = {
          count: 0,
          totalTime: 0,
          maxTime: 0
        };
      }

      summary[metric.commandName].count++;
      summary[metric.commandName].totalTime += metric.executionTimeMs;
      summary[metric.commandName].maxTime = Math.max(
        summary[metric.commandName].maxTime,
        metric.executionTimeMs
      );
    }

    // Convert to final format
    const result: Record<string, { count: number; avgTime: number; maxTime: number }> = {};
    for (const [commandName, data] of Object.entries(summary)) {
      result[commandName] = {
        count: data.count,
        avgTime: data.totalTime / data.count,
        maxTime: data.maxTime
      };
    }

    return result;
  }
}

export class PerformanceMiddleware implements CommandMiddleware {
  constructor(
    private readonly performanceMonitor: PerformanceMonitor,
    private readonly slowCommandThresholdMs: number = 1000
  ) {}

  async execute<TCommand extends Command, TResult = void>(
    command: TCommand,
    next: (command: TCommand) => Promise<TResult>
  ): Promise<TResult> {
    const startTime = Date.now();
    const commandName = command.constructor.name;
    const startMemory = this.getMemoryUsage();

    let success = false;
    
    try {
      const result = await next(command);
      success = true;
      return result;

    } catch (error) {
      success = false;
      throw error;

    } finally {
      const executionTime = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();
      const memoryDiff = endMemory - startMemory;

      const metric: PerformanceMetrics = {
        commandName,
        executionTimeMs: executionTime,
        timestamp: new Date(),
        success,
        memoryUsageMB: memoryDiff > 0 ? memoryDiff : undefined
      };

      this.performanceMonitor.recordMetric(metric);

      // Log slow commands
      if (executionTime > this.slowCommandThresholdMs) {
        console.warn('🐌 Slow command detected:', {
          commandName,
          commandId: command.commandId,
          executionTimeMs: executionTime,
          thresholdMs: this.slowCommandThresholdMs
        });
      }

      // Log performance summary periodically
      if (Math.random() < 0.01) { // 1% chance to log summary
        this.logPerformanceSummary();
      }
    }
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  private logPerformanceSummary(): void {
    if (this.performanceMonitor instanceof InMemoryPerformanceMonitor) {
      const summary = this.performanceMonitor.getMetricsSummary();
      console.log('📊 Performance Summary:', summary);
    }
  }
}