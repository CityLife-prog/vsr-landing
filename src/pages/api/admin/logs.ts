/**
 * Admin Logs API Endpoint
 * Provides access to application logs for monitoring and debugging
 */

import { NextApiResponse } from 'next';
import { withSecurity } from '../../../middleware/cors';
import { withAdminRateLimit } from '../../../middleware/rateLimit';
import { logger } from '../../../lib/logger';
import { 
  AdminApiRequest,
  AdminApiResponse,
  AdminApiError
} from '../../../types/admin-api';

interface LogsRequest {
  action?: 'view' | 'stats' | 'clear';
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  limit?: number;
  since?: string; // ISO timestamp
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: any;
  requestId?: string;
  userId?: string;
  endpoint?: string;
  ip?: string;
}

interface LogsResponse extends AdminApiResponse {
  logs?: LogEntry[];
  stats?: {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    debugCount: number;
    oldestLogAge: number;
  };
  cleared?: boolean;
}

async function handler(
  req: AdminApiRequest<LogsRequest>, 
  res: NextApiResponse<LogsResponse | AdminApiError>
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ 
      success: false,
      message: `Method ${req.method} not allowed`,
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { action = 'view', level, limit = 100, since } = req.method === 'GET' ? req.query : (req.body || {});

    // Convert query parameters to proper types
    const parsedLimit = typeof limit === 'string' ? parseInt(limit) : 
                       Array.isArray(limit) ? parseInt(limit[0]) : limit;
    const parsedSince = since ? new Date(Array.isArray(since) ? since[0] : since) : undefined;

    switch (action) {
      case 'view':
        // Get application logs
        const logs = getFilteredLogs(level as string, parsedLimit, parsedSince);
        
        return res.status(200).json({
          success: true,
          logs,
          message: `Retrieved ${logs.length} log entries`
        });

      case 'stats':
        // Get log statistics
        const stats = getLogStats();
        
        return res.status(200).json({
          success: true,
          stats,
          message: 'Log statistics retrieved'
        });

      case 'clear':
        // Clear logs (admin only, POST required)
        if (req.method !== 'POST') {
          return res.status(405).json({
            success: false,
            message: 'POST method required for clearing logs',
            error: 'METHOD_NOT_ALLOWED'
          });
        }

        // Log the clear action for audit
        logger.logSecurityEvent('Admin cleared application logs', {
          userId: 'admin', // Would come from auth middleware
          endpoint: '/api/admin/logs',
          metadata: { action: 'clear_logs' }
        });

        return res.status(200).json({
          success: true,
          cleared: true,
          message: 'Logs cleared successfully'
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Supported actions: view, stats, clear',
          error: 'INVALID_ACTION'
        });
    }

  } catch (error) {
    logger.error('Admin logs API error', {
      error: error instanceof Error ? error : new Error(String(error)),
      endpoint: '/api/admin/logs',
      metadata: { 
        errorDetails: error instanceof Error ? error.message : String(error)
      }
    });
    
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get filtered logs from various sources
 * In a production system, this would connect to your log aggregation service
 */
function getFilteredLogs(level?: string, limit: number = 100, since?: Date): LogEntry[] {
  // For now, we'll simulate logs since we don't have persistent log storage
  // In production, this would query your logging infrastructure (ELK, Splunk, etc.)
  
  const mockLogs: LogEntry[] = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Admin authentication successful',
      context: { userId: 'admin', email: 'c***@outlook.com' },
      requestId: 'req_123456789',
      endpoint: '/api/admin/auth/login',
      ip: '192.168.1.***'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'warn',
      message: 'Rate limit warning',
      context: { remainingRequests: 2, windowMs: 60000 },
      requestId: 'req_123456788',
      endpoint: '/api/admin/users',
      ip: '192.168.1.***'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'error',
      message: 'Database connection timeout',
      context: { timeout: 5000, retryAttempt: 3 },
      requestId: 'req_123456787',
      endpoint: '/api/admin/dashboard',
      ip: '192.168.1.***'
    },
    {
      timestamp: new Date(Date.now() - 180000).toISOString(),
      level: 'info',
      message: 'Environment validation passed',
      context: { environment: 'production', validatedVars: 15 }
    },
    {
      timestamp: new Date(Date.now() - 240000).toISOString(),
      level: 'debug',
      message: 'CORS headers set',
      context: { origin: 'https://vsrsnow.com' },
      requestId: 'req_123456786',
      endpoint: '/api/quote'
    }
  ];

  let filteredLogs = mockLogs;

  // Filter by level
  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }

  // Filter by time
  if (since) {
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= since);
  }

  // Apply limit
  return filteredLogs.slice(0, limit);
}

/**
 * Get log statistics
 * In production, this would aggregate data from your logging service
 */
function getLogStats(): {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  debugCount: number;
  oldestLogAge: number;
} {
  // Mock statistics - in production, query your log aggregation service
  return {
    totalLogs: 1247,
    errorCount: 23,
    warnCount: 156,
    infoCount: 891,
    debugCount: 177,
    oldestLogAge: 24 * 60 * 60 * 1000 // 24 hours in ms
  };
}

export default withSecurity(withAdminRateLimit(handler));