/**
 * Configuration Management System - Infrastructure Layer
 * Environment-based configuration with validation and type safety
 */

export interface ConfigurationManager {
  get<T>(key: string, defaultValue?: T): T;
  getRequired<T>(key: string): T;
  getSection<T>(section: string): T;
  has(key: string): boolean;
  set(key: string, value: unknown): void;
  reload(): Promise<void>;
  validate(): Promise<ValidationResult>;
  getEnvironment(): Environment;
  isDevelopment(): boolean;
  isProduction(): boolean;
  isTest(): boolean;
  getApplicationConfig(): ApplicationConfig;
}

export interface ConfigurationSource {
  name: string;
  priority: number;
  load(): Promise<Record<string, unknown>>;
  watch?(callback: (changes: ConfigurationChange[]) => void): void;
}

export interface ConfigurationChange {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  key: string;
  message: string;
  value: unknown;
  expectedType?: string;
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

export interface DatabaseConfig {
  provider: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionTimeout: number;
  queryTimeout: number;
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  acquireTimeoutMs: number;
  reapIntervalMs: number;
  createTimeoutMs: number;
  createRetryIntervalMs: number;
  propagateCreateError: boolean;
}

export interface CacheConfig {
  provider: 'memory' | 'redis' | 'memcached';
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  keyPrefix?: string;
  defaultTTL: number;
  maxMemory?: number;
}

export interface StorageConfig {
  provider: 'aws_s3' | 'google_cloud' | 'azure_blob' | 'local';
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  maxFileSize: number;
  allowedTypes: string[];
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  sessionSecret: string;
  sessionMaxAge: number;
  csrfProtection: boolean;
  helmet: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  transports: Array<{
    type: 'console' | 'file' | 'database' | 'http';
    options: Record<string, unknown>;
  }>;
  enableMetrics: boolean;
  enableTracing: boolean;
  sampleRate: number;
}

export interface ApplicationConfig {
  name: string;
  version: string;
  port: number;
  host: string;
  environment: Environment;
  debug: boolean;
  timezone: string;
  locale: string;
  database: DatabaseConfig;
  cache: CacheConfig;
  storage: StorageConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  email: {
    provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
    apiKey?: string;
    from: string;
  };
  features: {
    enableAnalytics: boolean;
    enableCaching: boolean;
    enableCompression: boolean;
    enableRateLimit: boolean;
    maintenanceMode: boolean;
  };
}

export class EnvironmentConfigurationManager implements ConfigurationManager {
  private config: Record<string, unknown> = {};
  private sources: ConfigurationSource[] = [];
  private environment: Environment;
  private watchers: Array<(changes: ConfigurationChange[]) => void> = [];
  private schema: ConfigurationSchema;

  constructor(
    environment?: Environment,
    sources: ConfigurationSource[] = [],
    schema?: ConfigurationSchema
  ) {
    this.environment = environment || this.detectEnvironment();
    this.sources = sources;
    this.schema = schema || new DefaultConfigurationSchema();
    this.setupDefaultSources();
  }

  async initialize(): Promise<void> {
    await this.loadConfiguration();
    this.setupWatchers();
  }

  get<T>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(key);
    return value !== undefined ? (value as T) : defaultValue!;
  }

  getRequired<T>(key: string): T {
    const value = this.getNestedValue(key);
    
    if (value === undefined) {
      throw new ConfigurationError(
        `Required configuration key '${key}' is missing`,
        key
      );
    }
    
    return value as T;
  }

  getSection<T>(section: string): T {
    const sectionConfig = this.config[section];
    
    if (!sectionConfig) {
      throw new ConfigurationError(
        `Configuration section '${section}' not found`,
        section
      );
    }
    
    return sectionConfig as T;
  }

  has(key: string): boolean {
    return this.getNestedValue(key) !== undefined;
  }

  set(key: string, value: unknown): void {
    this.setNestedValue(key, value);
  }

  async reload(): Promise<void> {
    const oldConfig = { ...this.config };
    await this.loadConfiguration();
    this.notifyWatchers(oldConfig, this.config);
  }

  async validate(): Promise<ValidationResult> {
    return this.schema.validate(this.config);
  }

  getEnvironment(): Environment {
    return this.environment;
  }

  isDevelopment(): boolean {
    return this.environment === Environment.DEVELOPMENT;
  }

  isProduction(): boolean {
    return this.environment === Environment.PRODUCTION;
  }

  isTest(): boolean {
    return this.environment === Environment.TEST;
  }

  getApplicationConfig(): ApplicationConfig {
    return {
      name: this.getRequired<string>('app.name'),
      version: this.get<string>('app.version', '1.0.0'),
      port: this.get<number>('app.port', 3000),
      host: this.get<string>('app.host', 'localhost'),
      environment: this.environment,
      debug: this.get<boolean>('app.debug', false),
      timezone: this.get<string>('app.timezone', 'UTC'),
      locale: this.get<string>('app.locale', 'en'),
      database: this.getSection<DatabaseConfig>('database'),
      cache: this.getSection<CacheConfig>('cache'),
      storage: this.getSection<StorageConfig>('storage'),
      security: this.getSection<SecurityConfig>('security'),
      monitoring: this.getSection<MonitoringConfig>('monitoring'),
      email: this.getSection('email'),
      features: this.getSection('features')
    };
  }

  private detectEnvironment(): Environment {
    const nodeEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : undefined;
    
    switch (nodeEnv?.toLowerCase()) {
      case 'production':
        return Environment.PRODUCTION;
      case 'staging':
        return Environment.STAGING;
      case 'test':
        return Environment.TEST;
      default:
        return Environment.DEVELOPMENT;
    }
  }

  private setupDefaultSources(): void {
    this.sources = [
      new EnvironmentVariableSource(),
      new FileSource(`config/${this.environment}.json`),
      new FileSource('config/default.json'),
      ...this.sources
    ].sort((a, b) => b.priority - a.priority);
  }

  private async loadConfiguration(): Promise<void> {
    this.config = {};
    
    for (const source of this.sources) {
      try {
        const sourceConfig = await source.load();
        this.mergeConfiguration(sourceConfig);
      } catch (error) {
        console.warn(`Failed to load configuration from ${source.name}:`, error);
      }
    }
  }

  private mergeConfiguration(sourceConfig: Record<string, unknown>): void {
    this.config = this.deepMerge(this.config, sourceConfig);
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(
          result[key] as Record<string, unknown> || {},
          source[key] as Record<string, unknown>
        );
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private getNestedValue(key: string): unknown {
    const keys = key.split('.');
    let value: unknown = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private setNestedValue(key: string, value: unknown): void {
    const keys = key.split('.');
    let current: Record<string, unknown> = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private setupWatchers(): void {
    for (const source of this.sources) {
      if (source.watch) {
        source.watch((changes) => {
          this.notifyWatchers({}, this.config, changes);
        });
      }
    }
  }

  private notifyWatchers(
    oldConfig: Record<string, unknown>,
    newConfig: Record<string, unknown>,
    sourceChanges?: ConfigurationChange[]
  ): void {
    const changes = sourceChanges || this.detectChanges(oldConfig, newConfig);
    
    for (const watcher of this.watchers) {
      try {
        watcher(changes);
      } catch (error) {
        console.error('Configuration watcher error:', error);
      }
    }
  }

  private detectChanges(
    oldConfig: Record<string, unknown>,
    newConfig: Record<string, unknown>,
    prefix = ''
  ): ConfigurationChange[] {
    const changes: ConfigurationChange[] = [];
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
    
    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldConfig[key];
      const newValue = newConfig[key];
      
      if (oldValue !== newValue) {
        if (typeof oldValue === 'object' && typeof newValue === 'object') {
          changes.push(...this.detectChanges(
            oldValue as Record<string, unknown>,
            newValue as Record<string, unknown>,
            fullKey
          ));
        } else {
          changes.push({
            key: fullKey,
            oldValue,
            newValue,
            source: 'configuration'
          });
        }
      }
    }
    
    return changes;
  }

  onConfigurationChange(callback: (changes: ConfigurationChange[]) => void): void {
    this.watchers.push(callback);
  }
}

export class EnvironmentVariableSource implements ConfigurationSource {
  readonly name = 'environment';
  readonly priority = 100;

  async load(): Promise<Record<string, unknown>> {
    if (typeof process === 'undefined') {
      return {};
    }

    const config: Record<string, unknown> = {};
    
    // Map environment variables to nested configuration
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.setNestedValue(config, this.envKeyToConfigKey(key), this.parseValue(value));
      }
    }
    
    return config;
  }

  private envKeyToConfigKey(envKey: string): string {
    return envKey
      .toLowerCase()
      .replace(/_/g, '.')
      .replace(/^app\./, '');
  }

  private parseValue(value: string): unknown {
    // Try to parse as JSON first
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    // Parse boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Parse numeric values
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    
    return value;
  }

  private setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }
    
    current[keys[keys.length - 1]] = value;
  }
}

export class FileSource implements ConfigurationSource {
  readonly name: string;
  readonly priority = 50;

  constructor(private readonly filePath: string) {
    this.name = `file:${filePath}`;
  }

  async load(): Promise<Record<string, unknown>> {
    try {
      // In a real implementation, you would use fs.readFile or similar
      // For now, return empty config since we don't have file system access
      return {};
    } catch (error) {
      console.warn(`Could not load configuration file ${this.filePath}:`, error);
      return {};
    }
  }
}

export interface ConfigurationSchema {
  validate(config: Record<string, unknown>): Promise<ValidationResult>;
}

export class DefaultConfigurationSchema implements ConfigurationSchema {
  async validate(config: Record<string, unknown>): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate required fields
    const requiredFields = [
      'app.name',
      'database.host',
      'database.port',
      'database.database',
      'database.username',
      'database.password'
    ];

    for (const field of requiredFields) {
      if (!this.hasNestedValue(config, field)) {
        errors.push({
          key: field,
          message: `Required configuration field '${field}' is missing`,
          value: undefined
        });
      }
    }

    // Validate data types
    const typeValidations = [
      { key: 'app.port', type: 'number' },
      { key: 'app.debug', type: 'boolean' },
      { key: 'database.port', type: 'number' },
      { key: 'database.ssl', type: 'boolean' },
      { key: 'cache.defaultTTL', type: 'number' }
    ];

    for (const validation of typeValidations) {
      const value = this.getNestedValue(config, validation.key);
      if (value !== undefined && typeof value !== validation.type) {
        errors.push({
          key: validation.key,
          message: `Configuration field '${validation.key}' must be of type ${validation.type}`,
          value,
          expectedType: validation.type
        });
      }
    }

    // Validate ranges
    const port = this.getNestedValue(config, 'app.port');
    if (typeof port === 'number' && (port < 1 || port > 65535)) {
      errors.push({
        key: 'app.port',
        message: 'Port must be between 1 and 65535',
        value: port
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private hasNestedValue(obj: Record<string, unknown>, key: string): boolean {
    return this.getNestedValue(obj, key) !== undefined;
  }

  private getNestedValue(obj: Record<string, unknown>, key: string): unknown {
    const keys = key.split('.');
    let value: unknown = obj;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
}

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly key?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}