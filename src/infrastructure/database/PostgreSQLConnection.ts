/**
 * PostgreSQL Connection Implementation - Infrastructure Layer
 * Cloud-ready PostgreSQL adapter with connection pooling
 */

import {
  DatabaseConnection,
  DatabaseTransaction,
  DatabaseConfig,
  DatabaseProvider,
  QueryResult,
  ExecuteResult,
  ConnectionInfo,
  ConnectionStats,
  ConnectionError,
  QueryError,
  TransactionError
} from './DatabaseConnection';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

// Note: In production, you would import from 'pg'
// import { Pool, PoolClient, PoolConfig } from 'pg';

// Mock interfaces for development (replace with actual pg types in production)
interface MockPool {
  connect(): Promise<MockPoolClient>;
  end(): Promise<void>;
  query(text: string, params?: unknown[]): Promise<MockQueryResult>;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

interface MockPoolClient {
  query(text: string, params?: unknown[]): Promise<MockQueryResult>;
  release(): void;
  rollback(): Promise<void>;
}

interface MockQueryResult {
  rows: unknown[];
  rowCount: number;
  fields?: Array<{ name: string; dataTypeID: number }>;
}

export class PostgreSQLConnection implements DatabaseConnection {
  private pool: MockPool | null = null;
  private config: DatabaseConfig;
  private stats: ConnectionStats;
  private connectionInfo: ConnectionInfo | null = null;
  private isConnectedFlag = false;

  constructor(config: DatabaseConfig) {
    this.config = { ...config, provider: DatabaseProvider.POSTGRESQL };
    this.stats = this.initializeStats();
  }

  async connect(): Promise<void> {
    try {
      // In production, this would be:
      // this.pool = new Pool(this.buildPoolConfig());
      
      // Mock implementation for development
      this.pool = this.createMockPool();
      
      // Test connection
      await this.pool.query('SELECT 1');
      
      this.isConnectedFlag = true;
      this.connectionInfo = {
        provider: DatabaseProvider.POSTGRESQL,
        host: this.config.host || 'localhost',
        database: this.config.database || 'unknown',
        connectionId: UniqueEntityId.create().toString(),
        connectedAt: new Date(),
        maxConnections: this.config.poolSize || 20
      };

      console.log('✅ PostgreSQL connection established');
    } catch (error) {
      throw new ConnectionError(
        `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnectedFlag = false;
      console.log('🔌 PostgreSQL connection closed');
    }
  }

  isConnected(): boolean {
    return this.isConnectedFlag && this.pool !== null;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async beginTransaction(): Promise<DatabaseTransaction> {
    if (!this.pool) {
      throw new ConnectionError('No active connection');
    }

    const client = await this.pool.connect();
    const transaction = new PostgreSQLTransaction(client);
    await transaction.begin();
    return transaction;
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryId = UniqueEntityId.create().toString();

    try {
      if (!this.pool) {
        throw new ConnectionError('No active connection');
      }

      const result = await this.pool.query(sql, params);
      const executionTimeMs = Date.now() - startTime;

      this.updateStats(executionTimeMs, true);

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || result.rows.length,
        fields: result.fields?.map(field => ({
          name: field.name,
          type: this.mapDataType(field.dataTypeID),
          nullable: true // Would be determined from schema in production
        })),
        executionTimeMs,
        queryId
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      this.updateStats(executionTimeMs, false);

      throw new QueryError(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sql,
        params,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    const startTime = Date.now();
    const queryId = UniqueEntityId.create().toString();

    try {
      if (!this.pool) {
        throw new ConnectionError('No active connection');
      }

      const result = await this.pool.query(sql, params);
      const executionTimeMs = Date.now() - startTime;

      this.updateStats(executionTimeMs, true);

      return {
        affectedRows: result.rowCount || 0,
        insertId: this.extractInsertId(result),
        executionTimeMs,
        queryId
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      this.updateStats(executionTimeMs, false);

      throw new QueryError(
        `Execute failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sql,
        params,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  getConnectionInfo(): ConnectionInfo {
    if (!this.connectionInfo) {
      throw new ConnectionError('Connection not established');
    }

    return {
      ...this.connectionInfo,
      currentConnections: this.pool?.totalCount || 0
    };
  }

  getStats(): ConnectionStats {
    const now = Date.now();
    const connectedAt = this.connectionInfo?.connectedAt.getTime() || now;

    return {
      ...this.stats,
      connectionUptime: now - connectedAt,
      lastActivity: new Date()
    };
  }

  // Private methods
  private createMockPool(): MockPool {
    // Mock implementation for development
    return {
      async connect() {
        return {
          async query(text: string, params?: unknown[]) {
            // Simulate query execution
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
            return {
              rows: [],
              rowCount: 0,
              fields: []
            };
          },
          release() {
            // Mock release
          },
          async rollback() {
            // Mock rollback
          }
        };
      },
      async end() {
        // Mock end
      },
      async query(text: string, params?: unknown[]) {
        // Simulate query execution
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return {
          rows: [],
          rowCount: 0,
          fields: []
        };
      },
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0
    };
  }

  private initializeStats(): ConnectionStats {
    return {
      totalQueries: 0,
      totalExecutionTimeMs: 0,
      averageExecutionTimeMs: 0,
      slowQueries: 0,
      failedQueries: 0,
      activeTransactions: 0,
      connectionUptime: 0,
      lastActivity: new Date()
    };
  }

  private updateStats(executionTimeMs: number, success: boolean): void {
    this.stats.totalQueries++;
    this.stats.totalExecutionTimeMs += executionTimeMs;
    this.stats.averageExecutionTimeMs = this.stats.totalExecutionTimeMs / this.stats.totalQueries;
    this.stats.lastActivity = new Date();

    if (executionTimeMs > 1000) { // 1 second threshold
      this.stats.slowQueries++;
    }

    if (!success) {
      this.stats.failedQueries++;
    }
  }

  private mapDataType(dataTypeID: number): string {
    // Map PostgreSQL OIDs to type names
    const typeMap: Record<number, string> = {
      23: 'integer',
      25: 'text',
      1043: 'varchar',
      16: 'boolean',
      1082: 'date',
      1184: 'timestamp'
    };

    return typeMap[dataTypeID] || 'unknown';
  }

  private extractInsertId(result: MockQueryResult): string | number | undefined {
    // In PostgreSQL, you'd typically use RETURNING clause to get the inserted ID
    // This is a simplified mock implementation
    if (result.rows.length > 0 && typeof result.rows[0] === 'object') {
      const row = result.rows[0] as Record<string, unknown>;
      return row.id as string | number;
    }
    return undefined;
  }
}

class PostgreSQLTransaction implements DatabaseTransaction {
  private transactionId: string;
  private isActiveFlag = false;

  constructor(private client: MockPoolClient) {
    this.transactionId = UniqueEntityId.create().toString();
  }

  async begin(): Promise<void> {
    try {
      await this.client.query('BEGIN');
      this.isActiveFlag = true;
    } catch (error) {
      throw new TransactionError(
        `Failed to begin transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async commit(): Promise<void> {
    try {
      if (!this.isActiveFlag) {
        throw new TransactionError('Transaction is not active');
      }
      
      await this.client.query('COMMIT');
      this.isActiveFlag = false;
      this.client.release();
    } catch (error) {
      throw new TransactionError(
        `Failed to commit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async rollback(): Promise<void> {
    try {
      if (this.isActiveFlag) {
        await this.client.rollback();
        this.isActiveFlag = false;
      }
      this.client.release();
    } catch (error) {
      throw new TransactionError(
        `Failed to rollback transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async savepoint(name: string): Promise<void> {
    if (!this.isActiveFlag) {
      throw new TransactionError('Transaction is not active');
    }
    
    await this.client.query(`SAVEPOINT ${name}`);
  }

  async rollbackToSavepoint(name: string): Promise<void> {
    if (!this.isActiveFlag) {
      throw new TransactionError('Transaction is not active');
    }
    
    await this.client.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.isActiveFlag) {
      throw new TransactionError('Transaction is not active');
    }

    const startTime = Date.now();
    const queryId = UniqueEntityId.create().toString();

    try {
      const result = await this.client.query(sql, params);
      const executionTimeMs = Date.now() - startTime;

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || result.rows.length,
        executionTimeMs,
        queryId
      };
    } catch (error) {
      throw new QueryError(
        `Transaction query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sql,
        params,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    if (!this.isActiveFlag) {
      throw new TransactionError('Transaction is not active');
    }

    const startTime = Date.now();
    const queryId = UniqueEntityId.create().toString();

    try {
      const result = await this.client.query(sql, params);
      const executionTimeMs = Date.now() - startTime;

      return {
        affectedRows: result.rowCount || 0,
        executionTimeMs,
        queryId
      };
    } catch (error) {
      throw new QueryError(
        `Transaction execute failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sql,
        params,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  isActive(): boolean {
    return this.isActiveFlag;
  }

  getId(): string {
    return this.transactionId;
  }
}