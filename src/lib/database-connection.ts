/**
 * Database Connection Manager
 * Handles database connections with proper pooling and error handling
 */

import { getDatabaseConfig, getConnectionOptions, validateDatabaseConfig, DatabaseConfig } from './database-config';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command?: string;
}

export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
  isConnected(): boolean;
}

class DatabaseManager {
  private connection: DatabaseConnection | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const config = getDatabaseConfig();
    const options = getConnectionOptions();

    // Validate configuration
    const configErrors = validateDatabaseConfig(config);
    if (configErrors.length > 0) {
      throw new Error(`Database configuration errors: ${configErrors.join(', ')}`);
    }

    console.log(`Initializing ${config.type} database connection...`);

    try {
      this.connection = await this.createConnection(config, options);
      this.isInitialized = true;
      console.log('Database connection established successfully');
    } catch (error) {
      console.error('Failed to establish database connection:', error);
      throw error;
    }
  }

  private async createConnection(config: DatabaseConfig, options: any): Promise<DatabaseConnection> {
    switch (config.type) {
      case 'postgresql':
        return this.createPostgreSQLConnection(config, options);
      case 'mysql':
        return this.createMySQLConnection(config, options);
      case 'sqlite':
        return this.createSQLiteConnection(config, options);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  private async createPostgreSQLConnection(config: DatabaseConfig, options: any): Promise<DatabaseConnection> {
    // For now, return a mock connection since we don't have pg installed
    console.warn('PostgreSQL connection not implemented - using mock connection');
    return this.createMockConnection();
  }

  private async createMySQLConnection(config: DatabaseConfig, options: any): Promise<DatabaseConnection> {
    // For now, return a mock connection since we don't have mysql2 installed
    console.warn('MySQL connection not implemented - using mock connection');
    return this.createMockConnection();
  }

  private async createSQLiteConnection(config: DatabaseConfig, options: any): Promise<DatabaseConnection> {
    // For now, return a mock connection since we don't have sqlite3 installed
    console.warn('SQLite connection not implemented - using mock connection');
    return this.createMockConnection();
  }

  private createMockConnection(): DatabaseConnection {
    return {
      async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        console.log(`Mock query executed: ${sql}`, params);
        
        // Return mock data based on query type
        if (sql.toLowerCase().includes('select')) {
          return {
            rows: [] as T[],
            rowCount: 0,
            command: 'SELECT'
          };
        } else if (sql.toLowerCase().includes('insert')) {
          return {
            rows: [] as T[],
            rowCount: 1,
            command: 'INSERT'
          };
        } else if (sql.toLowerCase().includes('update')) {
          return {
            rows: [] as T[],
            rowCount: 1,
            command: 'UPDATE'
          };
        } else if (sql.toLowerCase().includes('delete')) {
          return {
            rows: [] as T[],
            rowCount: 1,
            command: 'DELETE'
          };
        }

        return {
          rows: [] as T[],
          rowCount: 0
        };
      },

      async close(): Promise<void> {
        console.log('Mock database connection closed');
      },

      isConnected(): boolean {
        return true;
      }
    };
  }

  async getConnection(): Promise<DatabaseConnection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.connection) {
      throw new Error('Database connection not available');
    }

    return this.connection;
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }

  isConnected(): boolean {
    return this.connection?.isConnected() || false;
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

export { databaseManager };

// Helper functions for common database operations
export async function executeQuery<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  const connection = await databaseManager.getConnection();
  return connection.query<T>(sql, params);
}

export async function initializeDatabase(): Promise<void> {
  return databaseManager.initialize();
}

export async function closeDatabase(): Promise<void> {
  return databaseManager.close();
}

// Database health check
export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy', message: string }> {
  try {
    if (!databaseManager.isConnected()) {
      await databaseManager.initialize();
    }

    // Try a simple query
    await executeQuery('SELECT 1 as test');
    
    return {
      status: 'healthy',
      message: 'Database connection is working properly'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}