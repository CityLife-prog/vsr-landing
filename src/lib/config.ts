// Configuration management system with validation and environment support
// BACKEND IMPROVEMENT: Centralized configuration with type safety and validation

import { logger } from './logger';

/**
 * Environment types
 * IMPROVEMENT: Type-safe environment configuration
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Application configuration interface
 * IMPROVEMENT: Comprehensive configuration structure
 */
export interface AppConfig {
  // Environment and deployment
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  version: string;
  buildTimestamp?: string;
  gitCommit?: string;
  gitBranch?: string;

  // Server configuration
  server: {
    port: number;
    host: string;
    baseUrl: string;
    corsOrigins: string[];
    trustProxy: boolean;
    requestTimeout: number;
    maxRequestSize: string;
  };

  // Database configuration
  database: {
    provider: 'sqlite' | 'postgresql' | 'mysql' | 'supabase' | 'planetscale';
    url?: string;
    host?: string;
    port?: number;
    name?: string;
    username?: string;
    password?: string;
    ssl: boolean;
    maxConnections: number;
    timeout: number;
    retryAttempts: number;
  };

  // Email configuration
  email: {
    provider: 'gmail' | 'sendgrid' | 'ses' | 'smtp';
    host?: string;
    port?: number;
    secure: boolean;
    username: string;
    password: string;
    fromName: string;
    fromAddress: string;
    retryAttempts: number;
    retryDelay: number;
    timeout: number;
    queueEnabled: boolean;
    queueMaxSize: number;
  };

  // Cache configuration
  cache: {
    provider: 'memory' | 'redis' | 'file';
    ttl: number;
    maxSize: number;
    compress: boolean;
    prefix: string;
    redis?: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
  };

  // Security configuration
  security: {
    rateLimit: {
      windowMs: number;
      maxRequests: number;
      skipSuccessfulRequests: boolean;
    };
    cors: {
      origin: string | string[];
      credentials: boolean;
      methods: string[];
      allowedHeaders: string[];
    };
    helmet: {
      contentSecurityPolicy: boolean;
      crossOriginEmbedderPolicy: boolean;
      hsts: boolean;
    };
    fileUpload: {
      maxFileSize: number;
      maxFiles: number;
      allowedMimeTypes: string[];
      blockedExtensions: string[];
    };
  };

  // Logging configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    format: 'json' | 'text';
    enableConsole: boolean;
    enableFile: boolean;
    filePath?: string;
    maxFileSize: string;
    maxFiles: number;
    sensitiveFields: string[];
  };

  // Monitoring configuration
  monitoring: {
    enabled: boolean;
    metricsEnabled: boolean;
    healthCheckInterval: number;
    performanceTracking: boolean;
    errorTracking: boolean;
    externalServices: {
      sentry?: {
        dsn: string;
        environment: string;
      };
      datadog?: {
        apiKey: string;
        service: string;
      };
    };
  };

  // Feature flags
  features: {
    databaseEnabled: boolean;
    emailQueueEnabled: boolean;
    cacheEnabled: boolean;
    analyticsEnabled: boolean;
    maintenanceMode: boolean;
    apiVersioning: boolean;
    rateLimiting: boolean;
  };

  // API configuration
  api: {
    version: string;
    prefix: string;
    documentation: {
      enabled: boolean;
      path: string;
      title: string;
      description: string;
    };
    deprecation: {
      warningHeader: boolean;
      sunsetHeader: boolean;
    };
  };

  // File storage configuration
  storage: {
    provider: 'local' | 's3' | 'gcs' | 'azure';
    local?: {
      uploadPath: string;
      publicPath: string;
    };
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
}

/**
 * Configuration validation schema
 * IMPROVEMENT: Runtime configuration validation
 */
export interface ConfigValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  enum?: string[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  defaultValue?: unknown;
  description: string;
}

/**
 * Configuration validator
 * IMPROVEMENT: Comprehensive configuration validation
 */
export class ConfigValidator {
  private rules: ConfigValidationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // Environment rules
    this.addRule({
      key: 'NODE_ENV',
      required: true,
      type: 'string',
      enum: ['development', 'staging', 'production', 'test'],
      defaultValue: 'development',
      description: 'Application environment'
    });

    // Server rules
    this.addRule({
      key: 'PORT',
      required: false,
      type: 'number',
      min: 1,
      max: 65535,
      defaultValue: 3000,
      description: 'Server port number'
    });

    this.addRule({
      key: 'BASE_URL',
      required: false,
      type: 'string',
      pattern: /^https?:\/\/.+/,
      defaultValue: 'http://localhost:3000',
      description: 'Base URL for the application'
    });

    // Database rules
    this.addRule({
      key: 'DATABASE_PROVIDER',
      required: false,
      type: 'string',
      enum: ['sqlite', 'postgresql', 'mysql', 'supabase', 'planetscale'],
      defaultValue: 'sqlite',
      description: 'Database provider'
    });

    this.addRule({
      key: 'DATABASE_URL',
      required: false,
      type: 'string',
      description: 'Database connection URL'
    });

    // Email rules
    this.addRule({
      key: 'GMAIL_USER',
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      description: 'Gmail username for email service'
    });

    this.addRule({
      key: 'GMAIL_APP_PASSWORD',
      required: true,
      type: 'string',
      description: 'Gmail app password for email service'
    });

    // Security rules
    this.addRule({
      key: 'RATE_LIMIT_WINDOW_MS',
      required: false,
      type: 'number',
      min: 1000,
      defaultValue: 900000, // 15 minutes
      description: 'Rate limiting window in milliseconds'
    });

    this.addRule({
      key: 'RATE_LIMIT_MAX_REQUESTS',
      required: false,
      type: 'number',
      min: 1,
      defaultValue: 5,
      description: 'Maximum requests per rate limit window'
    });

    // Add more rules as needed...
    logger.info('Configuration validation rules initialized', {
      metadata: { ruleCount: this.rules.length }
    });
  }

  public addRule(rule: ConfigValidationRule): void {
    this.rules.push(rule);
  }

  public validate(env: Record<string, string | undefined>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    config: Record<string, unknown>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config: Record<string, unknown> = {};

    for (const rule of this.rules) {
      const value = env[rule.key];
      const processedValue = this.processValue(value, rule);

      if (rule.required && (value === undefined || value === '')) {
        errors.push(`Required environment variable '${rule.key}' is missing`);
        continue;
      }

      if (value === undefined || value === '') {
        if (rule.defaultValue !== undefined) {
          config[rule.key] = rule.defaultValue;
          warnings.push(`Using default value for '${rule.key}': ${rule.defaultValue}`);
        }
        continue;
      }

      const validationResult = this.validateValue(processedValue, rule);
      if (!validationResult.valid) {
        errors.push(`Invalid value for '${rule.key}': ${validationResult.error}`);
        continue;
      }

      config[rule.key] = processedValue;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config
    };
  }

  private processValue(value: string | undefined, rule: ConfigValidationRule): unknown {
    if (value === undefined || value === '') {
      return rule.defaultValue;
    }

    switch (rule.type) {
      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'array':
        return value.split(',').map(s => s.trim());
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  private validateValue(value: unknown, rule: ConfigValidationRule): {
    valid: boolean;
    error?: string;
  } {
    // Type validation
    if (typeof value !== rule.type && rule.type !== 'array' && rule.type !== 'object') {
      return { valid: false, error: `Expected ${rule.type}, got ${typeof value}` };
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(String(value))) {
      return { valid: false, error: `Must be one of: ${rule.enum.join(', ')}` };
    }

    // Number range validation
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return { valid: false, error: `Must be at least ${rule.min}` };
      }
      if (rule.max !== undefined && value > rule.max) {
        return { valid: false, error: `Must be at most ${rule.max}` };
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return { valid: false, error: `Does not match required pattern` };
    }

    return { valid: true };
  }

  public getRules(): ConfigValidationRule[] {
    return [...this.rules];
  }
}

/**
 * Configuration manager
 * IMPROVEMENT: Centralized configuration management with validation
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private validator: ConfigValidator;
  private isValidated: boolean = false;

  private constructor() {
    this.validator = new ConfigValidator();
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    const env = process.env;
    
    // Validate environment variables
    const validation = this.validator.validate(env);
    
    if (!validation.isValid) {
      const errorMessage = `Configuration validation failed:\n${validation.errors.join('\n')}`;
      logger.error('Configuration validation failed', {
        metadata: { errors: validation.errors, warnings: validation.warnings }
      });
      throw new Error(errorMessage);
    }

    if (validation.warnings.length > 0) {
      logger.warn('Configuration warnings', {
        metadata: { warnings: validation.warnings }
      });
    }

    this.isValidated = true;
    
    // Build typed configuration object
    const environment = (env.NODE_ENV as Environment) || 'development';
    
    const config: AppConfig = {
      // Environment and deployment
      environment,
      isDevelopment: environment === 'development',
      isProduction: environment === 'production',
      version: env.npm_package_version || '1.0.0',
      buildTimestamp: env.BUILD_TIMESTAMP,
      gitCommit: env.GIT_COMMIT,
      gitBranch: env.GIT_BRANCH,

      // Server configuration
      server: {
        port: parseInt(env.PORT || '3000'),
        host: env.HOST || 'localhost',
        baseUrl: env.BASE_URL || 'http://localhost:3000',
        corsOrigins: env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        trustProxy: env.TRUST_PROXY === 'true',
        requestTimeout: parseInt(env.REQUEST_TIMEOUT || '30000'),
        maxRequestSize: env.MAX_REQUEST_SIZE || '50mb',
      },

      // Database configuration
      database: {
        provider: (env.DATABASE_PROVIDER as AppConfig['database']['provider']) || 'sqlite',
        url: env.DATABASE_URL,
        host: env.DATABASE_HOST,
        port: env.DATABASE_PORT ? parseInt(env.DATABASE_PORT) : undefined,
        name: env.DATABASE_NAME || 'vsr-landing.db',
        username: env.DATABASE_USERNAME,
        password: env.DATABASE_PASSWORD,
        ssl: env.DATABASE_SSL === 'true',
        maxConnections: parseInt(env.DATABASE_MAX_CONNECTIONS || '10'),
        timeout: parseInt(env.DATABASE_TIMEOUT || '30000'),
        retryAttempts: parseInt(env.DATABASE_RETRY_ATTEMPTS || '3'),
      },

      // Email configuration
      email: {
        provider: 'gmail',
        username: env.GMAIL_USER || '',
        password: env.GMAIL_APP_PASSWORD || '',
        fromName: env.EMAIL_FROM_NAME || 'VSR Construction Services',
        fromAddress: env.EMAIL_FROM_ADDRESS || env.GMAIL_USER || '',
        secure: true,
        retryAttempts: parseInt(env.EMAIL_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(env.EMAIL_RETRY_DELAY || '60000'),
        timeout: parseInt(env.EMAIL_TIMEOUT || '30000'),
        queueEnabled: env.EMAIL_QUEUE_ENABLED !== 'false',
        queueMaxSize: parseInt(env.EMAIL_QUEUE_MAX_SIZE || '1000'),
      },

      // Cache configuration
      cache: {
        provider: (env.CACHE_PROVIDER as AppConfig['cache']['provider']) || 'memory',
        ttl: parseInt(env.CACHE_TTL || '300'),
        maxSize: parseInt(env.CACHE_MAX_SIZE || '1000'),
        compress: env.CACHE_COMPRESS === 'true',
        prefix: env.CACHE_PREFIX || 'vsr',
        redis: env.REDIS_URL ? {
          host: env.REDIS_HOST || 'localhost',
          port: parseInt(env.REDIS_PORT || '6379'),
          password: env.REDIS_PASSWORD,
          db: parseInt(env.REDIS_DB || '0'),
        } : undefined,
      },

      // Security configuration
      security: {
        rateLimit: {
          windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
          maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '5'),
          skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESS === 'true',
        },
        cors: {
          origin: env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
          credentials: env.CORS_CREDENTIALS !== 'false',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        },
        helmet: {
          contentSecurityPolicy: env.CSP_ENABLED !== 'false',
          crossOriginEmbedderPolicy: env.COEP_ENABLED === 'true',
          hsts: environment === 'production',
        },
        fileUpload: {
          maxFileSize: parseInt(env.MAX_FILE_SIZE || '5242880'), // 5MB
          maxFiles: parseInt(env.MAX_FILES || '10'),
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
          ],
          blockedExtensions: ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.vbs', '.scr'],
        },
      },

      // Logging configuration
      logging: {
        level: (env.LOG_LEVEL as AppConfig['logging']['level']) || 'info',
        format: environment === 'production' ? 'json' : 'text',
        enableConsole: env.LOG_CONSOLE !== 'false',
        enableFile: env.LOG_FILE === 'true',
        filePath: env.LOG_FILE_PATH,
        maxFileSize: env.LOG_MAX_FILE_SIZE || '10MB',
        maxFiles: parseInt(env.LOG_MAX_FILES || '5'),
        sensitiveFields: [
          'password', 'secret', 'token', 'key', 'auth', 'credential',
          'email', 'phone', 'ssn', 'credit', 'card', 'account'
        ],
      },

      // Monitoring configuration
      monitoring: {
        enabled: env.MONITORING_ENABLED !== 'false',
        metricsEnabled: env.METRICS_ENABLED !== 'false',
        healthCheckInterval: parseInt(env.HEALTH_CHECK_INTERVAL || '30000'),
        performanceTracking: env.PERFORMANCE_TRACKING !== 'false',
        errorTracking: env.ERROR_TRACKING !== 'false',
        externalServices: {
          sentry: env.SENTRY_DSN ? {
            dsn: env.SENTRY_DSN,
            environment,
          } : undefined,
          datadog: env.DATADOG_API_KEY ? {
            apiKey: env.DATADOG_API_KEY,
            service: env.DATADOG_SERVICE || 'vsr-landing',
          } : undefined,
        },
      },

      // Feature flags
      features: {
        databaseEnabled: env.FEATURE_DATABASE !== 'false',
        emailQueueEnabled: env.FEATURE_EMAIL_QUEUE !== 'false',
        cacheEnabled: env.FEATURE_CACHE !== 'false',
        analyticsEnabled: env.FEATURE_ANALYTICS !== 'false',
        maintenanceMode: env.MAINTENANCE_MODE === 'true',
        apiVersioning: env.FEATURE_API_VERSIONING !== 'false',
        rateLimiting: env.FEATURE_RATE_LIMITING !== 'false',
      },

      // API configuration
      api: {
        version: env.API_VERSION || 'v1',
        prefix: env.API_PREFIX || '/api',
        documentation: {
          enabled: env.API_DOCS_ENABLED !== 'false',
          path: env.API_DOCS_PATH || '/docs',
          title: env.API_DOCS_TITLE || 'VSR Landing API',
          description: env.API_DOCS_DESCRIPTION || 'API for VSR Construction Services',
        },
        deprecation: {
          warningHeader: env.API_DEPRECATION_WARNING !== 'false',
          sunsetHeader: env.API_SUNSET_HEADER !== 'false',
        },
      },

      // File storage configuration
      storage: {
        provider: (env.STORAGE_PROVIDER as AppConfig['storage']['provider']) || 'local',
        local: {
          uploadPath: env.UPLOAD_PATH || './uploads',
          publicPath: env.PUBLIC_PATH || '/uploads',
        },
        s3: env.S3_BUCKET ? {
          bucket: env.S3_BUCKET,
          region: env.S3_REGION || 'us-east-1',
          accessKeyId: env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
        } : undefined,
      },
    };

    logger.info('Configuration loaded successfully', {
      metadata: {
        environment,
        databaseProvider: config.database.provider,
        cacheProvider: config.cache.provider,
        storageProvider: config.storage.provider,
        featuresEnabled: Object.entries(config.features)
          .filter(([, enabled]) => enabled)
          .map(([feature]) => feature)
      }
    });

    return config;
  }

  public getConfig(): AppConfig {
    if (!this.isValidated) {
      throw new Error('Configuration has not been validated. Call validateConfig() first.');
    }
    return this.config;
  }

  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.getConfig()[key];
  }

  public isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.getConfig().features[feature];
  }

  public isDevelopment(): boolean {
    return this.getConfig().environment === 'development';
  }

  public isProduction(): boolean {
    return this.getConfig().environment === 'production';
  }

  public getValidator(): ConfigValidator {
    return this.validator;
  }

  public validateConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const validation = this.validator.validate(process.env);
    this.isValidated = validation.isValid;
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  public reloadConfig(): void {
    this.isValidated = false;
    this.config = this.loadConfig();
  }
}

// Export singleton instance and utilities
export const config = ConfigManager.getInstance();

/**
 * Environment variable requirement checker
 * IMPROVEMENT: Startup validation of required environment variables
 */
export function validateRequiredEnvVars(): void {
  const validation = config.validateConfig();
  
  if (!validation.isValid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`   ${error}`));
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`   ${warning}`));
  }

  console.log('✅ Configuration validated successfully');
}

export default config;