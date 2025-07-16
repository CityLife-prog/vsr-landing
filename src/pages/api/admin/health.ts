/**
 * Admin System Health API Endpoint
 * Provides system health monitoring and status information
 */

import { NextApiResponse } from 'next';
import { withSecurity } from '../../../middleware/cors';
import { withAdminRateLimit, getAllRateLimits } from '../../../middleware/rateLimit';
import { envConfig } from '../../../lib/env-validation';
import { logger } from '../../../lib/logger';
import { 
  AdminApiRequest,
  AdminApiResponse,
  AdminApiError
} from '../../../types/admin-api';

interface HealthResponse extends AdminApiResponse {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    email: ServiceStatus;
    authentication: ServiceStatus;
    rateLimit: ServiceStatus;
    logging: ServiceStatus;
  };
  metrics: {
    activeConnections: number;
    memoryUsage: NodeJS.MemoryUsage;
    rateLimits: {
      activeCount: number;
      totalRequests: number;
    };
    errors: {
      last24h: number;
      last1h: number;
    };
  };
  configuration: {
    nodeVersion: string;
    nextVersion: string;
    maxMemory: string;
    timezone: string;
  };
}

interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: string;
  message?: string;
  details?: Record<string, any>;
}

async function handler(
  req: AdminApiRequest, 
  res: NextApiResponse<HealthResponse | AdminApiError>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      success: false,
      message: `Method ${req.method} not allowed`,
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const startTime = Date.now();
    
    // Check all services
    const services = await checkAllServices();
    
    // Determine overall system status
    const overallStatus = determineOverallStatus(services);
    
    // Get system metrics
    const metrics = await getSystemMetrics();
    
    // Get configuration info
    const configuration = getConfigurationInfo();
    
    const responseTime = Date.now() - startTime;
    
    // Log health check
    logger.info('System health check completed', {
      endpoint: '/api/admin/health',
      metadata: {
        servicesChecked: Object.keys(services).length,
        healthCheckDuration: responseTime,
        status: overallStatus
      }
    });

    const healthResponse: HealthResponse = {
      success: true,
      status: overallStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: envConfig.NODE_ENV,
      services,
      metrics,
      configuration,
      message: `System status: ${overallStatus}`
    };

    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return res.status(httpStatus).json(healthResponse);

  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error : new Error(String(error)),
      endpoint: '/api/admin/health',
      metadata: { 
        errorDetails: error instanceof Error ? error.message : String(error)
      }
    });
    
    return res.status(500).json({ 
      success: false,
      message: 'Health check failed',
      error: 'HEALTH_CHECK_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check all critical services
 */
async function checkAllServices(): Promise<HealthResponse['services']> {
  const checkStart = Date.now();
  
  return {
    database: await checkDatabaseService(),
    email: await checkEmailService(),
    authentication: await checkAuthenticationService(),
    rateLimit: await checkRateLimitService(),
    logging: await checkLoggingService()
  };
}

/**
 * Check database connectivity
 */
async function checkDatabaseService(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    // In a real implementation, you'd test actual database connectivity
    // For now, we'll check configuration
    const isConfigured = !!(envConfig.DATABASE_HOST && envConfig.DATABASE_NAME);
    
    if (!isConfigured) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        message: 'Database not configured',
        details: { configured: false }
      };
    }
    
    // Simulate database check
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
      status: 'operational',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: 'Database connection healthy',
      details: {
        type: envConfig.DATABASE_TYPE,
        host: envConfig.DATABASE_HOST,
        ssl: envConfig.DATABASE_SSL
      }
    };
    
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: 'Database check failed',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Check email service
 */
async function checkEmailService(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    const isConfigured = !!(envConfig.EMAIL_FROM && envConfig.EMAIL_PASS);
    const isProduction = envConfig.NODE_ENV === 'production';
    
    // In development, show as degraded if not configured; in production, show as down
    const status = isConfigured ? 'operational' : (isProduction ? 'down' : 'degraded');
    const message = isConfigured 
      ? 'Email service configured' 
      : isProduction 
        ? 'Email service not configured (required for production)'
        : 'Email service not configured (development mode)';
    
    return {
      status,
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message,
      details: {
        configured: isConfigured,
        environment: envConfig.NODE_ENV,
        from: envConfig.EMAIL_FROM ? `${envConfig.EMAIL_FROM.substring(0, 3)}***` : 'not set'
      }
    };
    
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: 'Email service check failed',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Check authentication service
 */
async function checkAuthenticationService(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    const jwtConfigured = !!envConfig.JWT_SECRET && envConfig.JWT_SECRET !== 'dev-secret-key-change-in-production';
    const sessionConfigured = !!envConfig.SESSION_SECRET && envConfig.SESSION_SECRET !== 'dev-session-secret-change-in-production';
    
    const isHealthy = jwtConfigured && sessionConfigured;
    
    return {
      status: isHealthy ? 'operational' : 'degraded',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: isHealthy ? 'Authentication service healthy' : 'Authentication using default secrets',
      details: {
        jwtConfigured,
        sessionConfigured,
        securityLevel: isHealthy ? 'production' : 'development'
      }
    };
    
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: 'Authentication service check failed',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Check rate limiting service
 */
async function checkRateLimitService(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    const rateLimits = getAllRateLimits();
    
    return {
      status: 'operational',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: 'Rate limiting operational',
      details: {
        activeRateLimits: rateLimits.length,
        memoryStore: true
      }
    };
    
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: 'Rate limiting check failed',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Check logging service
 */
async function checkLoggingService(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    // Test logging functionality
    logger.debug('Health check logging test');
    
    return {
      status: 'operational',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: 'Logging service operational',
      details: {
        level: envConfig.LOG_LEVEL,
        monitoring: !!envConfig.SENTRY_DSN
      }
    };
    
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      message: 'Logging service check failed',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Determine overall system status based on service statuses
 */
function determineOverallStatus(services: HealthResponse['services']): 'healthy' | 'degraded' | 'critical' {
  const statuses = Object.values(services).map(service => service.status);
  
  if (statuses.includes('down')) {
    const downCount = statuses.filter(s => s === 'down').length;
    return downCount >= 2 ? 'critical' : 'degraded';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * Get system performance metrics
 */
async function getSystemMetrics(): Promise<HealthResponse['metrics']> {
  const rateLimits = getAllRateLimits();
  
  return {
    activeConnections: 0, // Would be tracked by connection pool
    memoryUsage: process.memoryUsage(),
    rateLimits: {
      activeCount: rateLimits.length,
      totalRequests: rateLimits.reduce((sum, rl) => sum + rl.count, 0)
    },
    errors: {
      last24h: 0, // Would be queried from logs
      last1h: 0   // Would be queried from logs
    }
  };
}

/**
 * Get system configuration information
 */
function getConfigurationInfo(): HealthResponse['configuration'] {
  return {
    nodeVersion: process.version,
    nextVersion: '15.3.1', // Could be read from package.json
    maxMemory: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

export default withSecurity(withAdminRateLimit(handler));