/**
 * Configuration Factory - Infrastructure Layer
 * Factory for creating and managing configuration instances
 */

import {
  ConfigurationManager,
  EnvironmentConfigurationManager,
  Environment,
  ConfigurationSource,
  ApplicationConfig,
  DatabaseConfig,
  CacheConfig,
  StorageConfig,
  SecurityConfig,
  MonitoringConfig
} from './ConfigurationManager';

export class ConfigFactory {
  private static instance: ConfigurationManager | null = null;

  static async create(
    environment?: Environment,
    sources?: ConfigurationSource[]
  ): Promise<ConfigurationManager> {
    if (!ConfigFactory.instance) {
      const configManager = new EnvironmentConfigurationManager(environment, sources);
      await configManager.initialize();
      ConfigFactory.instance = configManager;
    }
    
    return ConfigFactory.instance;
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigFactory.instance) {
      throw new Error('Configuration not initialized. Call ConfigFactory.create() first.');
    }
    
    return ConfigFactory.instance;
  }

  static reset(): void {
    ConfigFactory.instance = null;
  }

  static createDefaultApplicationConfig(): ApplicationConfig {
    return {
      name: 'VSR Landing',
      version: '1.0.0',
      port: 3000,
      host: '0.0.0.0',
      environment: Environment.DEVELOPMENT,
      debug: true,
      timezone: 'UTC',
      locale: 'en',
      database: ConfigFactory.createDefaultDatabaseConfig(),
      cache: ConfigFactory.createDefaultCacheConfig(),
      storage: ConfigFactory.createDefaultStorageConfig(),
      security: ConfigFactory.createDefaultSecurityConfig(),
      monitoring: ConfigFactory.createDefaultMonitoringConfig(),
      email: {
        provider: 'smtp',
        host: 'localhost',
        port: 587,
        secure: false,
        from: 'noreply@vsrlanding.com'
      },
      features: {
        enableAnalytics: false,
        enableCaching: true,
        enableCompression: true,
        enableRateLimit: true,
        maintenanceMode: false
      }
    };
  }

  static createDefaultDatabaseConfig(): DatabaseConfig {
    return {
      provider: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'vsr_landing',
      username: 'postgres',
      password: 'password',
      ssl: false,
      connectionTimeout: 30000,
      queryTimeout: 60000,
      maxConnections: 10,
      minConnections: 2,
      idleTimeoutMs: 300000,
      acquireTimeoutMs: 30000,
      reapIntervalMs: 1000,
      createTimeoutMs: 30000,
      createRetryIntervalMs: 200,
      propagateCreateError: false
    };
  }

  static createDefaultCacheConfig(): CacheConfig {
    return {
      provider: 'memory',
      defaultTTL: 3600,
      maxMemory: 104857600 // 100MB
    };
  }

  static createDefaultStorageConfig(): StorageConfig {
    return {
      provider: 'local',
      bucket: 'uploads',
      maxFileSize: 10485760, // 10MB
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
      ]
    };
  }

  static createDefaultSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: 'your-super-secret-jwt-key-change-this-in-production',
      jwtExpiresIn: '24h',
      bcryptRounds: 12,
      corsOrigins: ['http://localhost:3000'],
      rateLimitWindowMs: 900000, // 15 minutes
      rateLimitMaxRequests: 100,
      sessionSecret: 'your-super-secret-session-key-change-this-in-production',
      sessionMaxAge: 86400000, // 24 hours
      csrfProtection: true,
      helmet: true
    };
  }

  static createDefaultMonitoringConfig(): MonitoringConfig {
    return {
      enabled: true,
      level: 'info',
      transports: [
        {
          type: 'console',
          options: {
            colorize: true,
            timestamp: true
          }
        }
      ],
      enableMetrics: true,
      enableTracing: false,
      sampleRate: 0.1
    };
  }

  static createProductionConfig(): Partial<ApplicationConfig> {
    return {
      environment: Environment.PRODUCTION,
      debug: false,
      database: {
        ...ConfigFactory.createDefaultDatabaseConfig(),
        ssl: true,
        maxConnections: 50,
        minConnections: 5
      },
      cache: {
        provider: 'redis',
        host: 'redis-cluster.amazonaws.com',
        port: 6379,
        defaultTTL: 3600
      },
      storage: {
        provider: 'aws_s3',
        bucket: 'vsr-landing-production',
        region: 'us-east-1',
        maxFileSize: 52428800, // 50MB
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain'
        ]
      },
      security: {
        ...ConfigFactory.createDefaultSecurityConfig(),
        corsOrigins: ['https://vsrlanding.com', 'https://www.vsrlanding.com'],
        rateLimitMaxRequests: 1000,
        bcryptRounds: 14
      },
      monitoring: {
        enabled: true,
        level: 'warn',
        transports: [
          {
            type: 'file',
            options: {
              filename: '/var/log/vsr-landing/app.log',
              maxSize: '10MB',
              maxFiles: 10
            }
          },
          {
            type: 'http',
            options: {
              host: 'logs.example.com',
              port: 443,
              ssl: true
            }
          }
        ],
        enableMetrics: true,
        enableTracing: true,
        sampleRate: 1.0
      },
      features: {
        enableAnalytics: true,
        enableCaching: true,
        enableCompression: true,
        enableRateLimit: true,
        maintenanceMode: false
      }
    };
  }

  static createTestConfig(): Partial<ApplicationConfig> {
    return {
      environment: Environment.TEST,
      debug: false,
      database: {
        ...ConfigFactory.createDefaultDatabaseConfig(),
        database: 'vsr_landing_test',
        maxConnections: 5,
        minConnections: 1
      },
      cache: {
        provider: 'memory',
        defaultTTL: 60,
        maxMemory: 10485760 // 10MB
      },
      monitoring: {
        enabled: false,
        level: 'error',
        transports: [],
        enableMetrics: false,
        enableTracing: false,
        sampleRate: 0
      },
      features: {
        enableAnalytics: false,
        enableCaching: false,
        enableCompression: false,
        enableRateLimit: false,
        maintenanceMode: false
      }
    };
  }

  static createStagingConfig(): Partial<ApplicationConfig> {
    return {
      environment: Environment.STAGING,
      debug: true,
      database: {
        ...ConfigFactory.createDefaultDatabaseConfig(),
        database: 'vsr_landing_staging',
        ssl: true,
        maxConnections: 20,
        minConnections: 3
      },
      cache: {
        provider: 'redis',
        host: 'redis-staging.amazonaws.com',
        port: 6379,
        defaultTTL: 1800
      },
      storage: {
        provider: 'aws_s3',
        bucket: 'vsr-landing-staging',
        region: 'us-east-1',
        maxFileSize: 20971520, // 20MB
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf'
        ]
      },
      security: {
        ...ConfigFactory.createDefaultSecurityConfig(),
        corsOrigins: ['https://staging.vsrlanding.com'],
        rateLimitMaxRequests: 500
      },
      monitoring: {
        enabled: true,
        level: 'debug',
        transports: [
          {
            type: 'console',
            options: {
              colorize: true,
              timestamp: true
            }
          },
          {
            type: 'file',
            options: {
              filename: '/var/log/vsr-landing/staging.log',
              maxSize: '5MB',
              maxFiles: 5
            }
          }
        ],
        enableMetrics: true,
        enableTracing: true,
        sampleRate: 0.5
      },
      features: {
        enableAnalytics: true,
        enableCaching: true,
        enableCompression: true,
        enableRateLimit: true,
        maintenanceMode: false
      }
    };
  }
}

export const createConfiguration = ConfigFactory.create;
export const getConfiguration = ConfigFactory.getInstance;