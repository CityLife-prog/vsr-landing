// API documentation endpoint
// BACKEND IMPROVEMENT: Self-documenting API with interactive documentation

import { NextApiRequest, NextApiResponse } from 'next';
import { withApiVersion, apiDocs } from '@/lib/api-docs';
import { withMonitoring } from '@/lib/monitoring';
import { RequestTimer, logger } from '@/lib/logger';
import { config as appConfig } from '@/lib/config';

/**
 * API documentation endpoint
 * IMPROVEMENT: Self-hosted API documentation
 * 
 * GET /api/v1/docs
 * Returns API documentation in various formats:
 * - HTML (default): Interactive documentation
 * - JSON: OpenAPI specification
 * - Text: Plain text documentation
 */
async function docsHandler(req: NextApiRequest, res: NextApiResponse) {
  const timer = new RequestTimer(req);
  const requestId = timer.getRequestId();
  const config = appConfig.getConfig();

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

    // Check if documentation is enabled
    if (!config.api.documentation.enabled) {
      timer.end(404);
      return res.status(404).json({
        success: false,
        error: 'API documentation is not available'
      });
    }

    logger.info('API documentation requested', {
      requestId,
      metadata: { 
        format: req.query.format,
        userAgent: req.headers['user-agent']
      }
    });

    const format = req.query.format as string;

    if (format === 'json' || format === 'openapi') {
      // Return OpenAPI specification
      const openApiSpec = apiDocs.generateOpenApiSpec();
      
      timer.end(200);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      return res.json(openApiSpec);
      
    } else if (format === 'endpoints') {
      // Return endpoint list
      const endpoints = apiDocs.getAllEndpoints();
      
      timer.end(200);
      return res.json({
        success: true,
        endpoints: endpoints.map(endpoint => ({
          method: endpoint.method,
          path: endpoint.path,
          version: endpoint.version,
          description: endpoint.description,
          deprecated: endpoint.deprecated || false
        }))
      });
      
    } else {
      // Return HTML documentation
      const html = apiDocs.generateDocumentationHtml();
      
      timer.end(200);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      return res.send(html);
    }

  } catch (error) {
    logger.error('API documentation generation failed', {
      requestId,
      error: error instanceof Error ? error : new Error(String(error))
    });

    timer.end(500, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to generate API documentation',
      requestId,
      ...(appConfig.isDevelopment() && {
        debug: error instanceof Error ? error.message : String(error)
      })
    });
  }
}

// Export with middleware stack
export default withApiVersion('v1')(withMonitoring(docsHandler));