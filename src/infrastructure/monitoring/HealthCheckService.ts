/**
 * Health Check Service - Infrastructure Layer
 * Comprehensive health monitoring for cloud-ready applications
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { CacheProvider } from '../cache/CacheProvider';
import { CloudStorageProvider } from '../cloud/CloudStorageProvider';

export interface HealthCheckService {
  checkHealth(): Promise<HealthCheckResult>;
  getDetailedHealth(): Promise<DetailedHealthCheckResult>;
  isHealthy(): Promise<boolean>;
  registerHealthCheck(name: string, check: HealthCheck): void;
  unregisterHealthCheck(name: string): void;
}

export interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckStatus>;
  timeout?: number;
  critical?: boolean;
  tags?: string[];
}

export interface HealthCheckStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  data?: Record<string, unknown>;
  responseTime?: number;
  timestamp: Date;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  version?: string;
  uptime: number;
  checks: Record<string, HealthCheckStatus>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

export interface DetailedHealthCheckResult extends HealthCheckResult {
  system: SystemInfo;
  performance: PerformanceMetrics;
  dependencies: DependencyStatus[];
}

export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  architecture: string;
  hostname: string;
  environment: string;
  memory: {
    used: number;
    total: number;
    free: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk?: {
    used: number;
    total: number;
    free: number;
    percentage: number;
  };
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  activeConnections: number;
  queueLength: number;
  memoryLeaks: boolean;
}

export interface DependencyStatus {
  name: string;
  type: 'database' | 'cache' | 'storage' | 'api' | 'service';
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  version?: string;
  endpoint?: string;
  lastChecked: Date;
}

export class ApplicationHealthCheckService implements HealthCheckService {
  private healthChecks = new Map<string, HealthCheck>();
  private startTime = Date.now();
  private performanceMetrics: PerformanceMetrics = {
    averageResponseTime: 0,
    requestsPerSecond: 0,
    errorRate: 0,
    activeConnections: 0,
    queueLength: 0,
    memoryLeaks: false
  };

  constructor(
    private readonly database?: DatabaseConnection,
    private readonly cache?: CacheProvider,
    private readonly storage?: CloudStorageProvider,
    private readonly version?: string
  ) {
    this.setupDefaultHealthChecks();
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: Record<string, HealthCheckStatus> = {};
    
    let healthy = 0;
    let unhealthy = 0;
    let degraded = 0;

    // Execute all health checks
    const checkPromises = Array.from(this.healthChecks.entries()).map(
      async ([name, healthCheck]) => {
        try {
          const timeout = healthCheck.timeout || 5000;
          const checkStartTime = Date.now();
          
          const result = await Promise.race([
            healthCheck.check(),
            new Promise<HealthCheckStatus>((_, reject) =>
              setTimeout(() => reject(new Error('Health check timeout')), timeout)
            )
          ]);

          result.responseTime = Date.now() - checkStartTime;
          checks[name] = result;

          switch (result.status) {
            case 'healthy':
              healthy++;
              break;
            case 'unhealthy':
              unhealthy++;
              break;
            case 'degraded':
              degraded++;
              break;
          }
        } catch (error) {
          checks[name] = {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Unknown error',
            responseTime: Date.now() - startTime,
            timestamp: new Date()
          };
          unhealthy++;
        }
      }
    );

    await Promise.all(checkPromises);

    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (unhealthy > 0) {
      // Check if any critical systems are down
      const criticalDown = Array.from(this.healthChecks.entries()).some(
        ([name, healthCheck]) =>
          healthCheck.critical && checks[name]?.status === 'unhealthy'
      );
      
      overallStatus = criticalDown ? 'unhealthy' : 'degraded';
    } else if (degraded > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      version: this.version,
      uptime: Date.now() - this.startTime,
      checks,
      summary: {
        total: this.healthChecks.size,
        healthy,
        unhealthy,
        degraded
      }
    };
  }

  async getDetailedHealth(): Promise<DetailedHealthCheckResult> {
    const basicHealth = await this.checkHealth();
    
    return {
      ...basicHealth,
      system: await this.getSystemInfo(),
      performance: this.performanceMetrics,
      dependencies: await this.getDependencyStatus()
    };
  }

  async isHealthy(): Promise<boolean> {
    const health = await this.checkHealth();
    return health.status === 'healthy';
  }

  registerHealthCheck(name: string, check: HealthCheck): void {
    this.healthChecks.set(name, check);
  }

  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
  }

  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
  }

  private setupDefaultHealthChecks(): void {
    // Application basic health
    this.registerHealthCheck('application', {
      name: 'application',
      critical: true,
      async check(): Promise<HealthCheckStatus> {
        return {
          status: 'healthy',
          message: 'Application is running',
          timestamp: new Date()
        };
      }
    });

    // Memory usage check
    this.registerHealthCheck('memory', {
      name: 'memory',
      critical: false,
      async check(): Promise<HealthCheckStatus> {
        if (typeof process !== 'undefined' && process.memoryUsage) {
          const memory = process.memoryUsage();
          const usedMB = memory.heapUsed / 1024 / 1024;
          const totalMB = memory.heapTotal / 1024 / 1024;
          const percentage = (usedMB / totalMB) * 100;

          let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
          let message = `Memory usage: ${usedMB.toFixed(2)}MB (${percentage.toFixed(1)}%)`;

          if (percentage > 90) {
            status = 'unhealthy';
            message += ' - Critical memory usage';
          } else if (percentage > 75) {
            status = 'degraded';
            message += ' - High memory usage';
          }

          return {
            status,
            message,
            data: {
              used: usedMB,
              total: totalMB,
              percentage
            },
            timestamp: new Date()
          };
        }

        return {
          status: 'healthy',
          message: 'Memory monitoring not available',
          timestamp: new Date()
        };
      }
    });

    // Database health check
    if (this.database) {
      this.registerHealthCheck('database', {
        name: 'database',
        critical: true,
        timeout: 10000,
        check: async (): Promise<HealthCheckStatus> => {
          try {
            const isConnected = this.database!.isConnected();
            const canPing = await this.database!.ping();

            if (!isConnected || !canPing) {
              return {
                status: 'unhealthy',
                message: 'Database connection failed',
                timestamp: new Date()
              };
            }

            const connectionInfo = this.database!.getConnectionInfo();
            const stats = this.database!.getStats();

            return {
              status: 'healthy',
              message: 'Database is connected and responsive',
              data: {
                provider: connectionInfo.provider,
                connectionId: connectionInfo.connectionId,
                uptime: stats.connectionUptime,
                totalQueries: stats.totalQueries,
                averageResponseTime: stats.averageExecutionTimeMs
              },
              timestamp: new Date()
            };
          } catch (error) {
            return {
              status: 'unhealthy',
              message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date()
            };
          }
        }
      });
    }

    // Cache health check
    if (this.cache) {
      this.registerHealthCheck('cache', {
        name: 'cache',
        critical: false,
        timeout: 5000,
        check: async (): Promise<HealthCheckStatus> => {
          try {
            const canPing = await this.cache!.ping();

            if (!canPing) {
              return {
                status: 'degraded',
                message: 'Cache is not responding',
                timestamp: new Date()
              };
            }

            const info = await this.cache!.info();

            return {
              status: 'healthy',
              message: 'Cache is operational',
              data: {
                provider: info.provider,
                hitRate: info.stats?.hitRate,
                memoryUsage: info.memory?.percentage
              },
              timestamp: new Date()
            };
          } catch (error) {
            return {
              status: 'degraded',
              message: `Cache health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date()
            };
          }
        }
      });
    }

    // Storage health check
    if (this.storage) {
      this.registerHealthCheck('storage', {
        name: 'storage',
        critical: false,
        timeout: 10000,
        check: async (): Promise<HealthCheckStatus> => {
          try {
            // Test storage with a simple operation
            const testKey = `health-check-${Date.now()}`;
            const testData = Buffer.from('health-check');

            await this.storage!.upload(testKey, testData);
            const exists = await this.storage!.exists(testKey);
            await this.storage!.delete(testKey);

            if (!exists) {
              return {
                status: 'unhealthy',
                message: 'Storage write/read test failed',
                timestamp: new Date()
              };
            }

            const bucketInfo = await this.storage!.getBucketInfo();

            return {
              status: 'healthy',
              message: 'Storage is operational',
              data: {
                provider: bucketInfo.provider,
                bucket: bucketInfo.name,
                region: bucketInfo.region
              },
              timestamp: new Date()
            };
          } catch (error) {
            return {
              status: 'degraded',
              message: `Storage health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date()
            };
          }
        }
      });
    }
  }

  private async getSystemInfo(): Promise<SystemInfo> {
    const info: SystemInfo = {
      nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
      platform: typeof process !== 'undefined' ? process.platform : 'unknown',
      architecture: typeof process !== 'undefined' ? process.arch : 'unknown',
      hostname: typeof process !== 'undefined' ? (process.env.HOSTNAME || 'unknown') : 'unknown',
      environment: typeof process !== 'undefined' ? (process.env.NODE_ENV || 'unknown') : 'unknown',
      memory: {
        used: 0,
        total: 0,
        free: 0,
        percentage: 0
      },
      cpu: {
        usage: 0,
        loadAverage: []
      }
    };

    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      info.memory = {
        used: memory.heapUsed,
        total: memory.heapTotal,
        free: memory.heapTotal - memory.heapUsed,
        percentage: (memory.heapUsed / memory.heapTotal) * 100
      };
    }

    // Note: In a real implementation, you might use additional libraries
    // like 'os' module for more detailed system information

    return info;
  }

  private async getDependencyStatus(): Promise<DependencyStatus[]> {
    const dependencies: DependencyStatus[] = [];

    if (this.database) {
      try {
        const startTime = Date.now();
        await this.database.ping();
        const responseTime = Date.now() - startTime;
        
        dependencies.push({
          name: 'database',
          type: 'database',
          status: 'healthy',
          responseTime,
          lastChecked: new Date()
        });
      } catch {
        dependencies.push({
          name: 'database',
          type: 'database',
          status: 'unhealthy',
          responseTime: 0,
          lastChecked: new Date()
        });
      }
    }

    if (this.cache) {
      try {
        const startTime = Date.now();
        await this.cache.ping();
        const responseTime = Date.now() - startTime;
        
        dependencies.push({
          name: 'cache',
          type: 'cache',
          status: 'healthy',
          responseTime,
          lastChecked: new Date()
        });
      } catch {
        dependencies.push({
          name: 'cache',
          type: 'cache',
          status: 'unhealthy',
          responseTime: 0,
          lastChecked: new Date()
        });
      }
    }

    return dependencies;
  }
}