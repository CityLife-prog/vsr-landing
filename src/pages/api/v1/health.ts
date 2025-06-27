// Health check API endpoint with comprehensive monitoring
// BACKEND IMPROVEMENT: Production-ready health monitoring endpoint

import { NextApiRequest, NextApiResponse } from 'next';
import { withApiVersion } from '@/lib/api-docs';
import { withMonitoring, healthCheck, metrics } from '@/lib/monitoring';
import { RequestTimer, logger } from '@/lib/logger';

/**
 * Health check endpoint
 * IMPROVEMENT: Comprehensive system health reporting for monitoring systems
 * 
 * GET /api/v1/health
 * Returns detailed system health information including:
 * - Overall system status
 * - Individual service health checks
 * - Performance metrics
 * - System resources
 */
async function healthHandler(req: NextApiRequest, res: NextApiResponse) {
  const timer = new RequestTimer(req);
  const requestId = timer.getRequestId();
  
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      timer.end(405);
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET']
      });
    }

    logger.info('Health check requested', {
      requestId,
      metadata: { userAgent: req.headers['user-agent'] }
    });

    // Get comprehensive system health
    const systemHealth = await healthCheck.getSystemHealth();
    
    // Determine HTTP status code based on system health
    let statusCode = 200;
    if (systemHealth.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    } else if (systemHealth.status === 'degraded') {
      statusCode = 200; // OK but with warnings
    }

    // Format response for different audiences
    const query = req.query;
    const format = query.format as string;
    const detailed = query.detailed === 'true';

    let response: Record<string, unknown>;

    if (format === 'prometheus') {
      // Prometheus metrics format
      const prometheusMetrics = metrics.exportPrometheusMetrics();
      timer.end(statusCode);
      res.setHeader('Content-Type', 'text/plain');
      return res.status(statusCode).send(prometheusMetrics);
    } else if (format === 'simple') {
      // Simple status for load balancers
      response = {
        status: systemHealth.status,
        timestamp: systemHealth.timestamp
      };
    } else if (detailed) {
      // Detailed response for debugging and monitoring dashboards
      response = {
        status: systemHealth.status,
        timestamp: systemHealth.timestamp,
        version: systemHealth.version,
        environment: process.env.NODE_ENV || 'development',
        uptime: {
          seconds: Math.floor(systemHealth.uptime / 1000),
          human: formatUptime(systemHealth.uptime)
        },
        services: systemHealth.services,
        metrics: {
          ...systemHealth.metrics,
          // Add request-specific metrics
          requestDuration: systemHealth.metrics.averageResponseTime,
          requestHistogram: metrics.getHistogramStats('http_request_duration_ms'),
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          processId: process.pid,
          memoryUsage: process.memoryUsage(),
        },
        build: {
          timestamp: process.env.BUILD_TIMESTAMP || 'unknown',
          commit: process.env.GIT_COMMIT || 'unknown',
          branch: process.env.GIT_BRANCH || 'unknown',
        }
      };
    } else {
      // Standard response
      response = {
        status: systemHealth.status,
        timestamp: systemHealth.timestamp,
        version: systemHealth.version,
        uptime: Math.floor(systemHealth.uptime / 1000),
        services: Object.fromEntries(
          Object.entries(systemHealth.services).map(([name, service]) => [
            name,
            {
              status: service.status,
              responseTime: service.responseTime,
              lastChecked: service.lastChecked
            }
          ])
        ),
        metrics: {
          requests: systemHealth.metrics.requestCount,
          errors: systemHealth.metrics.errorCount,
          averageResponseTime: systemHealth.metrics.averageResponseTime,
          memoryUsage: systemHealth.metrics.memoryUsage.percentage
        }
      };
    }

    // Log health check completion
    if (systemHealth.status !== 'healthy') {
      logger.warn('System health check shows issues', {
        requestId,
        metadata: {
          status: systemHealth.status,
          unhealthyServices: Object.entries(systemHealth.services)
            .filter(([, service]) => service.status !== 'healthy')
            .map(([name, service]) => ({ name, status: service.status, error: service.error }))
        }
      });
    }

    timer.end(statusCode);
    res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Health check failed', {
      requestId,
      error: error instanceof Error ? error : new Error(String(error))
    });

    timer.end(500, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      message: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : String(error))
        : 'Internal server error'
    });
  }
}

/**
 * Format uptime in human-readable format
 * IMPROVEMENT: User-friendly uptime display
 */
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Export with middleware stack
export default withApiVersion('v1')(withMonitoring(healthHandler));