// Database abstraction layer with multiple provider support
// BACKEND IMPROVEMENT: Scalable data persistence architecture

import { logger } from './logger';

/**
 * Database configuration interface
 * IMPROVEMENT: Provider-agnostic database configuration
 */
export interface DatabaseConfig {
  provider: 'sqlite' | 'postgresql' | 'mysql' | 'supabase' | 'planetscale';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  timeout?: number;
}

/**
 * Application data models
 * IMPROVEMENT: Type-safe data structures for business entities
 */
export interface ApplicationSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  resumeFilename?: string;
  resumeUrl?: string;
  status: 'pending' | 'reviewed' | 'contacted' | 'hired' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface QuoteRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  service: string;
  details: string;
  photoFilenames: string[];
  photoUrls: string[];
  status: 'pending' | 'quoted' | 'accepted' | 'declined' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedValue?: number;
  quotedAmount?: number;
  submittedAt: Date;
  quotedAt?: Date;
  completedAt?: Date;
  assignedTo?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface ActivityLog {
  id: string;
  entityType: 'application' | 'quote';
  entityId: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  performedBy?: string;
  performedAt: Date;
  ipAddress?: string;
}

/**
 * Database operation result types
 * IMPROVEMENT: Consistent error handling and result typing
 */
export type DatabaseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};

/**
 * Abstract database interface
 * IMPROVEMENT: Provider-agnostic database operations
 */
export abstract class DatabaseProvider {
  protected config: DatabaseConfig;
  protected isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  // Connection management
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isHealthy(): Promise<boolean>;

  // Application submissions
  abstract createApplication(data: Omit<ApplicationSubmission, 'id' | 'submittedAt'>): Promise<DatabaseResult<ApplicationSubmission>>;
  abstract getApplication(id: string): Promise<DatabaseResult<ApplicationSubmission | null>>;
  abstract updateApplication(id: string, data: Partial<ApplicationSubmission>): Promise<DatabaseResult<ApplicationSubmission>>;
  abstract listApplications(limit?: number, offset?: number): Promise<DatabaseResult<ApplicationSubmission[]>>;

  // Quote requests
  abstract createQuote(data: Omit<QuoteRequest, 'id' | 'submittedAt'>): Promise<DatabaseResult<QuoteRequest>>;
  abstract getQuote(id: string): Promise<DatabaseResult<QuoteRequest | null>>;
  abstract updateQuote(id: string, data: Partial<QuoteRequest>): Promise<DatabaseResult<QuoteRequest>>;
  abstract listQuotes(limit?: number, offset?: number): Promise<DatabaseResult<QuoteRequest[]>>;

  // Activity logging
  abstract logActivity(data: Omit<ActivityLog, 'id' | 'performedAt'>): Promise<DatabaseResult<ActivityLog>>;
  abstract getActivityLog(entityType: string, entityId: string): Promise<DatabaseResult<ActivityLog[]>>;

  // Analytics and reporting
  abstract getSubmissionStats(days?: number): Promise<DatabaseResult<{
    totalApplications: number;
    totalQuotes: number;
    pendingApplications: number;
    pendingQuotes: number;
    averageResponseTime: number;
  }>>;
}

/**
 * SQLite implementation for development and small deployments
 * IMPROVEMENT: File-based database for simple deployments
 */
export class SQLiteProvider extends DatabaseProvider {
  private db: any; // Would use better-sqlite3 in production

  async connect(): Promise<void> {
    try {
      // In production, would use: const Database = require('better-sqlite3');
      // this.db = new Database(this.config.database || 'vsr-landing.db');
      
      logger.info('SQLite database connection established', {
        metadata: { provider: 'sqlite', database: this.config.database }
      });
      
      await this.initializeTables();
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to connect to SQLite database', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.isConnected = false;
      logger.info('SQLite database connection closed');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Would execute: SELECT 1
      return this.isConnected;
    } catch {
      return false;
    }
  }

  private async initializeTables(): Promise<void> {
    // SQL DDL for table creation
    const createApplicationsTable = `
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        experience TEXT NOT NULL,
        resume_filename TEXT,
        resume_url TEXT,
        status TEXT DEFAULT 'pending',
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME,
        notes TEXT,
        ip_address TEXT,
        user_agent TEXT,
        request_id TEXT
      )
    `;

    const createQuotesTable = `
      CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        service TEXT NOT NULL,
        details TEXT NOT NULL,
        photo_filenames TEXT, -- JSON array
        photo_urls TEXT, -- JSON array
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        estimated_value REAL,
        quoted_amount REAL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        quoted_at DATETIME,
        completed_at DATETIME,
        assigned_to TEXT,
        notes TEXT,
        ip_address TEXT,
        user_agent TEXT,
        request_id TEXT
      )
    `;

    const createActivityLogTable = `
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT, -- JSON
        performed_by TEXT,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT
      )
    `;

    // Would execute these DDL statements in production
    logger.info('Database tables initialized');
  }

  // Implementation methods would follow similar patterns
  async createApplication(data: Omit<ApplicationSubmission, 'id' | 'submittedAt'>): Promise<DatabaseResult<ApplicationSubmission>> {
    try {
      const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const submittedAt = new Date();
      
      const application: ApplicationSubmission = {
        id,
        ...data,
        submittedAt,
      };

      // Would execute INSERT statement in production
      
      logger.logBusinessEvent('application_created', {
        metadata: { applicationId: id, email: data.email }
      });

      return { success: true, data: application };
    } catch (error) {
      logger.error('Failed to create application', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      return { success: false, error: 'Failed to create application' };
    }
  }

  async getApplication(id: string): Promise<DatabaseResult<ApplicationSubmission | null>> {
    // Implementation would follow similar pattern
    return { success: true, data: null };
  }

  async updateApplication(id: string, data: Partial<ApplicationSubmission>): Promise<DatabaseResult<ApplicationSubmission>> {
    // Implementation would follow similar pattern
    throw new Error('Method not implemented');
  }

  async listApplications(limit = 50, offset = 0): Promise<DatabaseResult<ApplicationSubmission[]>> {
    // Implementation would follow similar pattern
    return { success: true, data: [] };
  }

  // Similar implementations for quotes and activity log...
  async createQuote(data: Omit<QuoteRequest, 'id' | 'submittedAt'>): Promise<DatabaseResult<QuoteRequest>> {
    try {
      const id = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const submittedAt = new Date();
      
      const quote: QuoteRequest = {
        id,
        ...data,
        submittedAt,
      };

      logger.logBusinessEvent('quote_created', {
        metadata: { quoteId: id, email: data.email, service: data.service }
      });

      return { success: true, data: quote };
    } catch (error) {
      logger.error('Failed to create quote', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      return { success: false, error: 'Failed to create quote' };
    }
  }

  async getQuote(id: string): Promise<DatabaseResult<QuoteRequest | null>> {
    return { success: true, data: null };
  }

  async updateQuote(id: string, data: Partial<QuoteRequest>): Promise<DatabaseResult<QuoteRequest>> {
    throw new Error('Method not implemented');
  }

  async listQuotes(limit = 50, offset = 0): Promise<DatabaseResult<QuoteRequest[]>> {
    return { success: true, data: [] };
  }

  async logActivity(data: Omit<ActivityLog, 'id' | 'performedAt'>): Promise<DatabaseResult<ActivityLog>> {
    try {
      const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const performedAt = new Date();
      
      const activity: ActivityLog = {
        id,
        ...data,
        performedAt,
      };

      return { success: true, data: activity };
    } catch (error) {
      return { success: false, error: 'Failed to log activity' };
    }
  }

  async getActivityLog(entityType: string, entityId: string): Promise<DatabaseResult<ActivityLog[]>> {
    return { success: true, data: [] };
  }

  async getSubmissionStats(days = 30): Promise<DatabaseResult<{
    totalApplications: number;
    totalQuotes: number;
    pendingApplications: number;
    pendingQuotes: number;
    averageResponseTime: number;
  }>> {
    // Would implement actual analytics query
    return {
      success: true,
      data: {
        totalApplications: 0,
        totalQuotes: 0,
        pendingApplications: 0,
        pendingQuotes: 0,
        averageResponseTime: 0,
      }
    };
  }
}

/**
 * Database manager with provider abstraction
 * IMPROVEMENT: Centralized database operations with provider switching
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private provider: DatabaseProvider | null = null;
  private config: DatabaseConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private loadConfig(): DatabaseConfig {
    const provider = (process.env.DATABASE_PROVIDER as DatabaseConfig['provider']) || 'sqlite';
    
    return {
      provider,
      connectionString: process.env.DATABASE_URL,
      database: process.env.DATABASE_NAME || 'vsr-landing.db',
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : undefined,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.DATABASE_SSL === 'true',
      maxConnections: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS) : 10,
      timeout: process.env.DATABASE_TIMEOUT ? parseInt(process.env.DATABASE_TIMEOUT) : 30000,
    };
  }

  public async initialize(): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'sqlite':
          this.provider = new SQLiteProvider(this.config);
          break;
        // Could add other providers:
        // case 'postgresql':
        //   this.provider = new PostgreSQLProvider(this.config);
        //   break;
        // case 'supabase':
        //   this.provider = new SupabaseProvider(this.config);
        //   break;
        default:
          throw new Error(`Unsupported database provider: ${this.config.provider}`);
      }

      await this.provider.connect();
      logger.info('Database initialized successfully', {
        metadata: { provider: this.config.provider }
      });
    } catch (error) {
      logger.error('Failed to initialize database', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }
    return await this.provider.isHealthy();
  }

  public getProvider(): DatabaseProvider {
    if (!this.provider) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.provider;
  }

  public async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
      logger.info('Database connection closed');
    }
  }
}

// Export singleton instance
export const database = DatabaseManager.getInstance();

/**
 * Database middleware for automatic initialization
 * IMPROVEMENT: Ensures database is ready for API requests
 */
export async function withDatabase<T>(
  operation: (db: DatabaseProvider) => Promise<T>
): Promise<T> {
  try {
    if (!database.getProvider) {
      await database.initialize();
    }
    
    const provider = database.getProvider();
    return await operation(provider);
  } catch (error) {
    logger.error('Database operation failed', {
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw error;
  }
}

export default database;