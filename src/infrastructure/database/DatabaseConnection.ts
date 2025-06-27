/**
 * Database Connection Interface - Infrastructure Layer
 * Cloud-ready database abstraction for multiple providers
 */

export interface DatabaseConnection {
  // Connection Management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  ping(): Promise<boolean>;
  
  // Transaction Management
  beginTransaction(): Promise<DatabaseTransaction>;
  
  // Query Execution
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  
  // Health and Monitoring
  getConnectionInfo(): ConnectionInfo;
  getStats(): ConnectionStats;
}

export interface DatabaseTransaction {
  // Transaction Control
  commit(): Promise<void>;
  rollback(): Promise<void>;
  savepoint(name: string): Promise<void>;
  rollbackToSavepoint(name: string): Promise<void>;
  
  // Query Execution within Transaction
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  
  // Transaction State
  isActive(): boolean;
  getId(): string;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  fields?: FieldInfo[];
  executionTimeMs: number;
  queryId: string;
}

export interface ExecuteResult {
  affectedRows: number;
  insertId?: string | number;
  executionTimeMs: number;
  queryId: string;
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
}

export interface ConnectionInfo {
  provider: DatabaseProvider;
  host: string;
  database: string;
  version?: string;
  connectionId: string;
  connectedAt: Date;
  maxConnections?: number;
  currentConnections?: number;
}

export interface ConnectionStats {
  totalQueries: number;
  totalExecutionTimeMs: number;
  averageExecutionTimeMs: number;
  slowQueries: number;
  failedQueries: number;
  activeTransactions: number;
  connectionUptime: number;
  lastActivity: Date;
}

export enum DatabaseProvider {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
  MONGODB = 'mongodb',
  DYNAMODB = 'dynamodb',
  FIRESTORE = 'firestore',
  SUPABASE = 'supabase',
  PLANETSCALE = 'planetscale',
  NEON = 'neon'
}

export interface DatabaseConfig {
  provider: DatabaseProvider;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean | SSLConfig;
  poolSize?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  options?: Record<string, unknown>;
}

export interface SSLConfig {
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface ConnectionPool {
  getConnection(): Promise<DatabaseConnection>;
  releaseConnection(connection: DatabaseConnection): Promise<void>;
  getPoolInfo(): PoolInfo;
  drain(): Promise<void>;
  clear(): Promise<void>;
}

export interface PoolInfo {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  maxConnections: number;
  minConnections: number;
}

export abstract class DatabaseError extends Error {
  abstract readonly errorCode: string;
  abstract readonly sqlState?: string;
  
  constructor(
    message: string,
    public readonly query?: string,
    public readonly params?: unknown[],
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ConnectionError extends DatabaseError {
  readonly errorCode = 'CONNECTION_ERROR';
  readonly sqlState?: string;
}

export class QueryError extends DatabaseError {
  readonly errorCode = 'QUERY_ERROR';
  
  constructor(
    message: string,
    query?: string,
    params?: unknown[],
    public readonly sqlState?: string,
    cause?: Error
  ) {
    super(message, query, params, cause);
  }
}

export class TransactionError extends DatabaseError {
  readonly errorCode = 'TRANSACTION_ERROR';
  readonly sqlState?: string;
}

export class ConstraintError extends DatabaseError {
  readonly errorCode = 'CONSTRAINT_ERROR';
  readonly sqlState?: string;
  
  constructor(
    message: string,
    public readonly constraintName?: string,
    query?: string,
    params?: unknown[],
    sqlState?: string,
    cause?: Error
  ) {
    super(message, query, params, cause);
    this.sqlState = sqlState;
  }
}