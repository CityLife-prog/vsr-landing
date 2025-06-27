/**
 * Infrastructure Layer - Main Export
 * Cloud-ready infrastructure components
 */

// Database Layer
export * from './database/DatabaseConnection';
export * from './database/PostgreSQLConnection';
export * from './database/Repository';

// Cache Layer
export * from './cache/CacheProvider';
export * from './cache/MemoryCacheProvider';

// Cloud Storage Layer
export * from './cloud/CloudStorageProvider';

// Monitoring & Health Checks
export * from './monitoring/HealthCheckService';

// Configuration Management
export type {
  ConfigurationManager,
  ConfigurationSource,
  ApplicationConfig,
  DatabaseConfig,
  StorageConfig,
  SecurityConfig,
  MonitoringConfig,
  ValidationResult,
  ValidationError
} from './config/ConfigurationManager';
export {
  EnvironmentConfigurationManager,
  Environment
} from './config/ConfigurationManager';
export { ConfigFactory, createConfiguration, getConfiguration } from './config/ConfigFactory';

// Repository Implementations
export * from './repositories/PostgreSQLQuoteRepository';

// Infrastructure Services Container
import { DatabaseConnection } from './database/DatabaseConnection';
import { PostgreSQLConnection } from './database/PostgreSQLConnection';
import { CacheProvider } from './cache/CacheProvider';
import { MemoryCacheProvider } from './cache/MemoryCacheProvider';
import { CloudStorageProvider } from './cloud/CloudStorageProvider';
import { HealthCheckService, ApplicationHealthCheckService } from './monitoring/HealthCheckService';
import { ConfigurationManager } from './config/ConfigurationManager';
import { ConfigFactory } from './config/ConfigFactory';
import { QuoteRepository } from '../domain/quote/QuoteRepository';
import { PostgreSQLQuoteRepository } from './repositories/PostgreSQLQuoteRepository';

export class InfrastructureContainer {
  private static instance: InfrastructureContainer | null = null;
  private readonly services = new Map<string, unknown>();

  private constructor() {}

  static getInstance(): InfrastructureContainer {
    if (!InfrastructureContainer.instance) {
      InfrastructureContainer.instance = new InfrastructureContainer();
    }
    return InfrastructureContainer.instance;
  }

  async initialize(): Promise<void> {
    // Initialize configuration
    const config = await ConfigFactory.create();
    this.register('config', config);

    const appConfig = config.getApplicationConfig();

    // Initialize database connection
    const dbConfig = {
      provider: appConfig.database.provider as any, // Type assertion for compatibility
      host: appConfig.database.host,
      port: appConfig.database.port,
      database: appConfig.database.database,
      username: appConfig.database.username,
      password: appConfig.database.password,
      ssl: appConfig.database.ssl,
      connectionTimeout: appConfig.database.connectionTimeout,
      queryTimeout: appConfig.database.queryTimeout,
      poolSize: appConfig.database.maxConnections
    };
    
    const database = new PostgreSQLConnection(dbConfig);
    await database.connect();
    this.register('database', database);

    // Initialize cache provider
    let cache: CacheProvider;
    if (appConfig.cache.provider === 'memory') {
      cache = new MemoryCacheProvider(
        appConfig.cache.maxMemory || 104857600,
        appConfig.cache.defaultTTL || 3600
      );
    } else {
      // For production, you would initialize Redis or other cache providers here
      cache = new MemoryCacheProvider();
    }
    this.register('cache', cache);

    // Initialize cloud storage (placeholder - would implement actual providers)
    // const storage = new CloudStorageProviderImpl(appConfig.storage);
    // this.register('storage', storage);

    // Initialize health check service
    const healthCheck = new ApplicationHealthCheckService(
      database,
      cache,
      undefined, // storage placeholder
      appConfig.version
    );
    this.register('healthCheck', healthCheck);

    // Initialize repositories
    const quoteRepository = new PostgreSQLQuoteRepository(database);
    this.register('quoteRepository', quoteRepository);

    // Create database schema in development
    if (appConfig.environment === 'development') {
      await quoteRepository.createSchema();
    }

    console.log('🚀 Infrastructure container initialized successfully');
  }

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered in infrastructure container`);
    }
    return service as T;
  }

  getDatabase(): DatabaseConnection {
    return this.resolve<DatabaseConnection>('database');
  }

  getCache(): CacheProvider {
    return this.resolve<CacheProvider>('cache');
  }

  getCloudStorage(): CloudStorageProvider {
    return this.resolve<CloudStorageProvider>('storage');
  }

  getHealthCheck(): HealthCheckService {
    return this.resolve<HealthCheckService>('healthCheck');
  }

  getConfiguration(): ConfigurationManager {
    return this.resolve<ConfigurationManager>('config');
  }

  getQuoteRepository(): QuoteRepository {
    return this.resolve<QuoteRepository>('quoteRepository');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down infrastructure services...');

    // Shutdown in reverse order of initialization
    const database = this.services.get('database') as DatabaseConnection;
    if (database) {
      await database.disconnect();
    }

    const cache = this.services.get('cache') as MemoryCacheProvider;
    if (cache && 'destroy' in cache) {
      cache.destroy();
    }

    this.services.clear();
    console.log('✅ Infrastructure services shut down successfully');
  }
}

// Convenience functions for accessing the infrastructure container
export const getInfrastructure = () => InfrastructureContainer.getInstance();
export const initializeInfrastructure = () => InfrastructureContainer.getInstance().initialize();