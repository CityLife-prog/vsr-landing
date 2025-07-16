/**
 * Environment Variable Validation and Fallbacks
 * Validates required environment variables and provides sensible defaults
 */

export interface EnvConfig {
  // App Configuration
  NODE_ENV: string;
  NEXT_PUBLIC_VERSION: string;
  
  // Database Configuration
  DATABASE_TYPE: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_SSL: boolean;
  DATABASE_CONNECTION_LIMIT: number;
  DATABASE_TIMEOUT: number;
  
  // Email Configuration
  EMAIL_FROM: string;
  EMAIL_PASS: string;
  
  // Security Configuration
  JWT_SECRET: string;
  SESSION_SECRET: string;
  
  // External Services
  GOOGLE_MAPS_API_KEY?: string;
  RECAPTCHA_SECRET_KEY?: string;
  
  // Monitoring
  LOG_LEVEL: string;
  SENTRY_DSN?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<EnvConfig>;
}

const REQUIRED_VARS = [
  'NODE_ENV',
  'NEXT_PUBLIC_VERSION',
  'EMAIL_FROM',
  'EMAIL_PASS'
];

const PRODUCTION_REQUIRED_VARS = [
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'JWT_SECRET',
  'SESSION_SECRET'
];

const DEFAULTS: Partial<EnvConfig> = {
  NODE_ENV: 'development',
  NEXT_PUBLIC_VERSION: '1',
  DATABASE_TYPE: 'postgresql',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_NAME: 'vsr_app',
  DATABASE_USER: 'vsr_user',
  DATABASE_SSL: false,
  DATABASE_CONNECTION_LIMIT: 10,
  DATABASE_TIMEOUT: 60000,
  JWT_SECRET: 'dev-secret-key-change-in-production',
  SESSION_SECRET: 'dev-session-secret-change-in-production',
  LOG_LEVEL: 'info'
};

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config: Partial<EnvConfig> = {};

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else {
      (config as any)[varName] = value;
    }
  }

  // Check production-specific requirements
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    for (const varName of PRODUCTION_REQUIRED_VARS) {
      const value = process.env[varName];
      if (!value) {
        errors.push(`Missing required production environment variable: ${varName}`);
      } else {
        (config as any)[varName] = value;
      }
    }
  }

  // Apply defaults and validate types
  config.NODE_ENV = process.env.NODE_ENV || DEFAULTS.NODE_ENV!;
  config.NEXT_PUBLIC_VERSION = process.env.NEXT_PUBLIC_VERSION || DEFAULTS.NEXT_PUBLIC_VERSION!;
  
  // Database configuration
  config.DATABASE_TYPE = process.env.DATABASE_TYPE || DEFAULTS.DATABASE_TYPE!;
  config.DATABASE_HOST = process.env.DATABASE_HOST || DEFAULTS.DATABASE_HOST!;
  config.DATABASE_PORT = parseInt(process.env.DATABASE_PORT || DEFAULTS.DATABASE_PORT!.toString());
  config.DATABASE_NAME = process.env.DATABASE_NAME || DEFAULTS.DATABASE_NAME!;
  config.DATABASE_USER = process.env.DATABASE_USER || DEFAULTS.DATABASE_USER!;
  config.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || '';
  config.DATABASE_SSL = process.env.DATABASE_SSL === 'true' || DEFAULTS.DATABASE_SSL!;
  config.DATABASE_CONNECTION_LIMIT = parseInt(
    process.env.DATABASE_CONNECTION_LIMIT || DEFAULTS.DATABASE_CONNECTION_LIMIT!.toString()
  );
  config.DATABASE_TIMEOUT = parseInt(
    process.env.DATABASE_TIMEOUT || DEFAULTS.DATABASE_TIMEOUT!.toString()
  );

  // Security configuration
  config.JWT_SECRET = process.env.JWT_SECRET || DEFAULTS.JWT_SECRET!;
  config.SESSION_SECRET = process.env.SESSION_SECRET || DEFAULTS.SESSION_SECRET!;

  // Email configuration
  config.EMAIL_FROM = process.env.EMAIL_FROM || '';
  config.EMAIL_PASS = process.env.EMAIL_PASS || '';

  // Optional configuration
  config.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  config.RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
  config.LOG_LEVEL = process.env.LOG_LEVEL || DEFAULTS.LOG_LEVEL!;
  config.SENTRY_DSN = process.env.SENTRY_DSN;

  // Validate numeric values
  if (isNaN(config.DATABASE_PORT) || config.DATABASE_PORT < 1 || config.DATABASE_PORT > 65535) {
    errors.push('DATABASE_PORT must be a valid port number (1-65535)');
  }

  if (isNaN(config.DATABASE_CONNECTION_LIMIT) || config.DATABASE_CONNECTION_LIMIT < 1) {
    errors.push('DATABASE_CONNECTION_LIMIT must be a positive integer');
  }

  if (isNaN(config.DATABASE_TIMEOUT) || config.DATABASE_TIMEOUT < 1000) {
    errors.push('DATABASE_TIMEOUT must be at least 1000ms');
  }

  // Validate email format
  if (config.EMAIL_FROM && !isValidEmail(config.EMAIL_FROM)) {
    errors.push('EMAIL_FROM must be a valid email address');
  }

  // Security warnings for production
  if (isProduction) {
    if (config.JWT_SECRET === DEFAULTS.JWT_SECRET) {
      errors.push('JWT_SECRET must be changed from default value in production');
    }

    if (config.SESSION_SECRET === DEFAULTS.SESSION_SECRET) {
      errors.push('SESSION_SECRET must be changed from default value in production');
    }

    if (!config.DATABASE_SSL && config.DATABASE_TYPE !== 'sqlite') {
      warnings.push('DATABASE_SSL should be enabled in production');
    }

    if (!config.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not configured - error monitoring disabled');
    }

    if (!config.GOOGLE_MAPS_API_KEY) {
      warnings.push('GOOGLE_MAPS_API_KEY not configured - maps may not work');
    }
  }

  // Development warnings
  if (!isProduction) {
    if (!config.DATABASE_PASSWORD && config.DATABASE_TYPE !== 'sqlite') {
      warnings.push('DATABASE_PASSWORD not set - using default for development');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config: config as EnvConfig
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getValidatedConfig(): EnvConfig {
  const result = validateEnvironment();
  
  if (!result.isValid) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid environment configuration');
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('✅ Environment validation passed');
  
  return result.config as EnvConfig;
}

// Initialize and validate on module load
export const envConfig = (() => {
  try {
    return getValidatedConfig();
  } catch (error) {
    console.error('Failed to load environment configuration:', error);
    // Return minimal config to prevent app crash
    return {
      NODE_ENV: 'development',
      NEXT_PUBLIC_VERSION: '1',
      DATABASE_TYPE: 'sqlite',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_NAME: 'vsr_dev',
      DATABASE_USER: 'dev',
      DATABASE_PASSWORD: '',
      DATABASE_SSL: false,
      DATABASE_CONNECTION_LIMIT: 10,
      DATABASE_TIMEOUT: 60000,
      EMAIL_FROM: '',
      EMAIL_PASS: '',
      JWT_SECRET: 'fallback-secret',
      SESSION_SECRET: 'fallback-session-secret',
      LOG_LEVEL: 'error'
    } as EnvConfig;
  }
})();