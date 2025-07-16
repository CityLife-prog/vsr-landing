/**
 * Database Configuration for Production
 * Provides flexible database connections for different environments
 */

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'sqlite';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionLimit?: number;
  timeout?: number;
}

export interface ConnectionOptions {
  retries: number;
  retryDelay: number;
  connectionTimeout: number;
  idleTimeout: number;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    // Production database configuration
    return {
      type: (process.env.DATABASE_TYPE as 'postgresql' | 'mysql' | 'sqlite') || 'postgresql',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'vsr_production',
      username: process.env.DATABASE_USER || 'vsr_user',
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.DATABASE_SSL === 'true',
      connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10'),
      timeout: parseInt(process.env.DATABASE_TIMEOUT || '60000')
    };
  } else if (env === 'development') {
    // Development database configuration
    return {
      type: 'sqlite',
      database: process.env.DATABASE_PATH || './data/vsr_dev.db'
    };
  } else {
    // Test environment - use in-memory SQLite
    return {
      type: 'sqlite',
      database: ':memory:'
    };
  }
};

export const getConnectionOptions = (): ConnectionOptions => ({
  retries: parseInt(process.env.DATABASE_RETRIES || '3'),
  retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY || '1000'),
  connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000'),
  idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '300000')
});

export const validateDatabaseConfig = (config: DatabaseConfig): string[] => {
  const errors: string[] = [];

  if (!config.database) {
    errors.push('Database name is required');
  }

  if (config.type === 'postgresql' || config.type === 'mysql') {
    if (!config.host) {
      errors.push('Database host is required for PostgreSQL/MySQL');
    }
    if (!config.username) {
      errors.push('Database username is required for PostgreSQL/MySQL');
    }
    if (!config.password && process.env.NODE_ENV === 'production') {
      errors.push('Database password is required for production');
    }
  }

  if (config.port && (config.port < 1 || config.port > 65535)) {
    errors.push('Database port must be between 1 and 65535');
  }

  return errors;
};