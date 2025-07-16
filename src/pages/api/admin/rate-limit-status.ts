/**
 * Admin Rate Limit Status API Endpoint
 * Provides rate limit monitoring and management for admins
 */

import { NextApiResponse } from 'next';
import { withSecurity } from '../../../middleware/cors';
import { withAdminRateLimit, getAllRateLimits, resetRateLimit, RATE_LIMIT_CONFIGS } from '../../../middleware/rateLimit';
import { 
  AdminApiRequest,
  AdminApiResponse,
  AdminApiError
} from '../../../types/admin-api';

interface RateLimitStatusRequest {
  action?: 'view' | 'reset';
  resetKey?: string;
}

interface RateLimitStatusResponse extends AdminApiResponse {
  rateLimits?: Array<{
    key: string;
    count: number;
    resetTime: number;
    remainingMs: number;
  }>;
  configs?: typeof RATE_LIMIT_CONFIGS;
  resetResult?: boolean;
}

async function handler(
  req: AdminApiRequest<RateLimitStatusRequest>, 
  res: NextApiResponse<RateLimitStatusResponse | AdminApiError>
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
    if (req.method === 'GET') {
      // Get current rate limit status
      const rateLimits = getAllRateLimits();
      
      return res.status(200).json({
        success: true,
        rateLimits,
        configs: RATE_LIMIT_CONFIGS,
        message: `Found ${rateLimits.length} active rate limits`
      });
    }

    if (req.method === 'POST') {
      const { action, resetKey } = req.body || {};
      
      if (action === 'reset' && resetKey) {
        // Reset specific rate limit key
        const wasReset = resetRateLimit(req, RATE_LIMIT_CONFIGS.API);
        
        return res.status(200).json({
          success: true,
          resetResult: wasReset,
          message: wasReset ? `Rate limit reset for key: ${resetKey}` : `No rate limit found for key: ${resetKey}`
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Invalid action or missing resetKey',
        error: 'INVALID_REQUEST'
      });
    }

  } catch (error) {
    console.error('Rate limit status API error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withSecurity(withAdminRateLimit(handler));