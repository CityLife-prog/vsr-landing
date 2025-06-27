/**
 * Database Resilience Patterns - Resilience Layer
 * Specialized resilience patterns for database operations
 */

import { CircuitBreaker, CircuitBreakerFactory } from './CircuitBreaker';
import { RetryManager, RetryFactory, withDatabaseRetry } from './RetryLogic';
import { DatabaseConnection, DatabaseTransaction, QueryResult, ExecuteResult } from '../infrastructure/database/DatabaseConnection';

export interface DatabaseResilienceConfig {
  enableCircuitBreaker: boolean;
  enableRetry: boolean;
  enableConnectionPooling: boolean;
  enableQueryTimeout: boolean;
  enableDeadlockDetection: boolean;
  enableReadReplicas: boolean;
  circuitBreakerConfig?: any;
  retryConfig?: any;
  timeoutMs: number;
  maxPoolSize: number;
  connectionHealthCheckInterval: number;
}

export interface DatabaseHealthMetrics {
  activeConnections: number;
  queuedConnections: number;
  failedQueries: number;
  averageQueryTime: number;
  connectionPoolUtilization: number;
  circuitBreakerState: string;
  lastHealthCheck: Date;
}

export class ResilientDatabaseConnection implements DatabaseConnection {
  private readonly baseConnection: DatabaseConnection;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryManager: RetryManager;
  private readonly config: DatabaseResilienceConfig;
  private connectionPool: DatabaseConnectionPool;
  private healthMetrics: DatabaseHealthMetrics;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(
    baseConnection: DatabaseConnection,
    config: Partial<DatabaseResilienceConfig> = {}
  ) {
    this.baseConnection = baseConnection;
    this.config = {
      enableCircuitBreaker: true,
      enableRetry: true,
      enableConnectionPooling: true,
      enableQueryTimeout: true,
      enableDeadlockDetection: true,
      enableReadReplicas: false,
      timeoutMs: 30000,
      maxPoolSize: 10,
      connectionHealthCheckInterval: 30000,
      ...config
    };

    // Initialize circuit breaker
    this.circuitBreaker = this.config.enableCircuitBreaker
      ? CircuitBreakerFactory.createDatabaseCircuitBreaker('database-main')
      : null as any;

    // Initialize retry manager
    this.retryManager = this.config.enableRetry
      ? RetryFactory.createDatabaseRetry(this.config.retryConfig)
      : null as any;

    // Initialize connection pool
    this.connectionPool = new DatabaseConnectionPool(
      baseConnection,
      this.config.maxPoolSize
    );

    // Initialize health metrics
    this.healthMetrics = {
      activeConnections: 0,
      queuedConnections: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      connectionPoolUtilization: 0,
      circuitBreakerState: 'closed',
      lastHealthCheck: new Date()
    };

    // Start health monitoring
    this.startHealthMonitoring();
  }

  async connect(): Promise<void> {
    return this.executeWithResilience(
      () => this.baseConnection.connect(),
      'connect'
    );
  }

  async disconnect(): Promise<void> {
    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Drain connection pool
    await this.connectionPool.drain();

    return this.baseConnection.disconnect();
  }

  isConnected(): boolean {
    return this.baseConnection.isConnected();
  }

  async ping(): Promise<boolean> {
    return this.executeWithResilience(
      () => this.baseConnection.ping(),
      'ping'
    );
  }

  async beginTransaction(): Promise<DatabaseTransaction> {
    const transaction = await this.executeWithResilience(
      () => this.baseConnection.beginTransaction(),
      'begin-transaction'
    );

    return new ResilientDatabaseTransaction(transaction, this.config);
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    return this.executeWithResilience(
      () => this.executeQuery(sql, params),
      'query'
    );
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    return this.executeWithResilience(
      () => this.executeCommand(sql, params),
      'execute'
    );
  }

  private async executeQuery<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      // Apply query timeout
      const queryPromise = this.config.enableQueryTimeout
        ? this.withTimeout(
            this.baseConnection.query<T>(sql, params),
            this.config.timeoutMs
          )
        : this.baseConnection.query<T>(sql, params);

      const result = await queryPromise;
      
      // Update metrics
      this.updateQueryMetrics(Date.now() - startTime, true);
      
      return result;
    } catch (error) {
      this.updateQueryMetrics(Date.now() - startTime, false);
      
      // Handle specific database errors
      if (this.isDeadlockError(error as Error)) {
        throw new DatabaseDeadlockError('Database deadlock detected', error as Error);
      }
      
      if (this.isConnectionError(error as Error)) {
        throw new DatabaseConnectionError('Database connection error', error as Error);
      }
      
      throw error;
    }
  }

  private async executeCommand(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    const startTime = Date.now();

    try {
      const commandPromise = this.config.enableQueryTimeout
        ? this.withTimeout(
            this.baseConnection.execute(sql, params),
            this.config.timeoutMs
          )
        : this.baseConnection.execute(sql, params);

      const result = await commandPromise;
      
      this.updateQueryMetrics(Date.now() - startTime, true);
      
      return result;
    } catch (error) {
      this.updateQueryMetrics(Date.now() - startTime, false);
      throw error;
    }
  }

  private async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationType: string
  ): Promise<T> {
    // Apply circuit breaker if enabled
    if (this.config.enableCircuitBreaker) {
      return this.circuitBreaker.execute(async () => {
        // Apply retry if enabled
        if (this.config.enableRetry) {
          const result = await this.retryManager.execute(operation);
          return result.result;
        }
        return operation();
      });
    }

    // Apply retry only if circuit breaker is disabled
    if (this.config.enableRetry) {
      const result = await this.retryManager.execute(operation);
      return result.result;
    }

    return operation();
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new DatabaseTimeoutError(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private isDeadlockError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('deadlock') || 
           message.includes('lock timeout') ||
           message.includes('concurrent update');
  }

  private isConnectionError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('connection') ||
           message.includes('network') ||
           message.includes('timeout') ||
           message.includes('econnreset');
  }

  private updateQueryMetrics(duration: number, success: boolean): void {
    if (!success) {
      this.healthMetrics.failedQueries++;
    }

    // Update average query time (simple moving average)
    this.healthMetrics.averageQueryTime = 
      (this.healthMetrics.averageQueryTime * 0.9) + (duration * 0.1);
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.updateHealthMetrics();
    }, this.config.connectionHealthCheckInterval);
  }

  private updateHealthMetrics(): void {
    this.healthMetrics.activeConnections = this.connectionPool.getActiveConnections();
    this.healthMetrics.queuedConnections = this.connectionPool.getQueuedConnections();
    this.healthMetrics.connectionPoolUtilization = 
      (this.healthMetrics.activeConnections / this.config.maxPoolSize) * 100;
    this.healthMetrics.circuitBreakerState = this.circuitBreaker?.getState() || 'disabled';
    this.healthMetrics.lastHealthCheck = new Date();
  }

  getConnectionInfo() {
    return this.baseConnection.getConnectionInfo();
  }

  getStats() {
    return {
      ...this.baseConnection.getStats(),
      resilience: this.healthMetrics
    };
  }

  getHealthMetrics(): DatabaseHealthMetrics {
    return { ...this.healthMetrics };
  }

  // Admin operations
  async forceHealthCheck(): Promise<DatabaseHealthMetrics> {
    await this.ping();
    this.updateHealthMetrics();
    return this.getHealthMetrics();
  }

  resetCircuitBreaker(): void {
    if (this.circuitBreaker) {
      this.circuitBreaker.reset();
    }
  }
}

class ResilientDatabaseTransaction implements DatabaseTransaction {
  private readonly baseTransaction: DatabaseTransaction;
  private readonly config: DatabaseResilienceConfig;
  private savepoints: string[] = [];

  constructor(baseTransaction: DatabaseTransaction, config: DatabaseResilienceConfig) {
    this.baseTransaction = baseTransaction;
    this.config = config;
  }

  async commit(): Promise<void> {
    return withDatabaseRetry(() => this.baseTransaction.commit());
  }

  async rollback(): Promise<void> {
    return withDatabaseRetry(() => this.baseTransaction.rollback());
  }

  async savepoint(name: string): Promise<void> {
    await withDatabaseRetry(() => this.baseTransaction.savepoint(name));
    this.savepoints.push(name);
  }

  async rollbackToSavepoint(name: string): Promise<void> {
    await withDatabaseRetry(() => this.baseTransaction.rollbackToSavepoint(name));
    
    // Remove savepoints after the rolled back one
    const index = this.savepoints.indexOf(name);
    if (index !== -1) {
      this.savepoints = this.savepoints.slice(0, index + 1);
    }
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    return withDatabaseRetry(() => this.baseTransaction.query<T>(sql, params));
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    return withDatabaseRetry(() => this.baseTransaction.execute(sql, params));
  }

  isActive(): boolean {
    return this.baseTransaction.isActive();
  }

  getId(): string {
    return this.baseTransaction.getId();
  }

  // Enhanced transaction with automatic savepoints
  async executeWithSavepoint<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    await this.savepoint(name);
    
    try {
      const result = await operation();
      return result;
    } catch (error) {
      await this.rollbackToSavepoint(name);
      throw error;
    }
  }
}

class DatabaseConnectionPool {
  private connections: DatabaseConnection[] = [];
  private activeConnections = 0;
  private queuedRequests: Array<{
    resolve: (connection: DatabaseConnection) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(
    private readonly connectionFactory: DatabaseConnection,
    private readonly maxSize: number
  ) {}

  async getConnection(): Promise<DatabaseConnection> {
    if (this.activeConnections < this.maxSize) {
      this.activeConnections++;
      return this.connectionFactory;
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      this.queuedRequests.push({ resolve, reject });
    });
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    this.activeConnections--;
    
    // Process queued requests
    if (this.queuedRequests.length > 0) {
      const { resolve } = this.queuedRequests.shift()!;
      this.activeConnections++;
      resolve(connection);
    }
  }

  getActiveConnections(): number {
    return this.activeConnections;
  }

  getQueuedConnections(): number {
    return this.queuedRequests.length;
  }

  async drain(): Promise<void> {
    // Reject all queued requests
    this.queuedRequests.forEach(({ reject }) => {
      reject(new Error('Connection pool is draining'));
    });
    this.queuedRequests = [];
    
    // Wait for active connections to be released
    while (this.activeConnections > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Database-specific errors
export class DatabaseResilienceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DatabaseResilienceError';
  }
}

export class DatabaseTimeoutError extends DatabaseResilienceError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DatabaseTimeoutError';
  }
}

export class DatabaseDeadlockError extends DatabaseResilienceError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DatabaseDeadlockError';
  }
}

export class DatabaseConnectionError extends DatabaseResilienceError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DatabaseConnectionError';
  }
}

// Utility decorators for database operations
export function DatabaseResilient(config?: Partial<DatabaseResilienceConfig>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withDatabaseRetry(() => method.apply(this, args));
    };

    return descriptor;
  };
}

// Factory for creating resilient database connections
export class DatabaseResilienceFactory {
  static create(
    baseConnection: DatabaseConnection,
    config?: Partial<DatabaseResilienceConfig>
  ): ResilientDatabaseConnection {
    return new ResilientDatabaseConnection(baseConnection, config);
  }

  static createHighAvailability(
    baseConnection: DatabaseConnection
  ): ResilientDatabaseConnection {
    return new ResilientDatabaseConnection(baseConnection, {
      enableCircuitBreaker: true,
      enableRetry: true,
      enableConnectionPooling: true,
      enableQueryTimeout: true,
      enableDeadlockDetection: true,
      timeoutMs: 15000,
      maxPoolSize: 20,
      connectionHealthCheckInterval: 10000,
      circuitBreakerConfig: {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000
      },
      retryConfig: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 10000
      }
    });
  }

  static createBasic(
    baseConnection: DatabaseConnection
  ): ResilientDatabaseConnection {
    return new ResilientDatabaseConnection(baseConnection, {
      enableCircuitBreaker: false,
      enableRetry: true,
      enableConnectionPooling: false,
      enableQueryTimeout: true,
      enableDeadlockDetection: true,
      timeoutMs: 30000,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 500,
        maxDelay: 5000
      }
    });
  }
}