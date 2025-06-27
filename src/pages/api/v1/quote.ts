// Enhanced quote request API endpoint with full backend infrastructure
// BACKEND IMPROVEMENT: Production-ready endpoint with comprehensive infrastructure

import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { withApiVersion } from '@/lib/api-docs';
import { withMonitoring, trackBusinessMetric } from '@/lib/monitoring';
import { RequestTimer, logger } from '@/lib/logger';
import { emailService } from '@/lib/email-service';
import { withDatabase } from '@/lib/database';
import { cache } from '@/lib/cache';
import { config as appConfig } from '@/lib/config';
import { validateFileUpload, checkRateLimit, generateSecureFilename } from '@/lib/security';
import { validateQuoteData } from '@/lib/validation';

/**
 * Enhanced quote request submission endpoint
 * IMPROVEMENT: Full integration with backend infrastructure
 * 
 * POST /api/v1/quote
 * Handles quote request submission with:
 * - Database persistence
 * - Async email processing
 * - Multiple file upload security
 * - Rate limiting
 * - Monitoring and metrics
 * - Service type validation
 * - Comprehensive error handling
 */
async function quoteHandler(req: NextApiRequest, res: NextApiResponse) {
  const timer = new RequestTimer(req);
  const requestId = timer.getRequestId();
  const config = appConfig.getConfig();
  

  try {
    // Method validation
    if (req.method !== 'POST') {
      timer.end(405);
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['POST']
      });
    }

    // Maintenance mode check
    if (config.features.maintenanceMode) {
      logger.warn('Request blocked - maintenance mode', { requestId });
      timer.end(503);
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable for maintenance'
      });
    }

    // Rate limiting
    if (config.features.rateLimiting) {
      const rateLimitResult = checkRateLimit(req);
      if (!rateLimitResult.allowed) {
        logger.logSecurityEvent('rate_limit_exceeded', {
          requestId,
          ip: rateLimitResult.ip,
          metadata: {
            attempts: rateLimitResult.totalRequests,
            window: rateLimitResult.windowMs
          }
        });
        
        timer.end(429);
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(rateLimitResult.timeUntilReset / 1000)
        });
      }
    }

    logger.info('Quote request submission started', {
      requestId,
      metadata: {
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length']
      }
    });

    // Parse multipart form data with multiple file support
    const form = formidable({
      maxFileSize: config.security.fileUpload.maxFileSize,
      maxFiles: config.security.fileUpload.maxFiles,
      maxTotalFileSize: config.security.fileUpload.maxFileSize * config.security.fileUpload.maxFiles,
      allowEmptyFiles: false,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    // Extract and validate form data
    const validationResult = validateQuoteData(fields, files);

    if (!validationResult.success || !validationResult.validatedData) {
      logger.warn('Quote request validation failed', {
        requestId,
        metadata: { errors: validationResult.errors }
      });

      timer.end(400);
      return res.status(400).json({
        success: false,
        error: 'Invalid quote request data',
        validationErrors: validationResult.errors
      });
    }

    const { validatedData, photoFiles } = validationResult;


    // Validate all uploaded photos
    const validatedPhotos: { file: formidable.File; newFilename: string }[] = [];
    if (photoFiles && photoFiles.length > 0) {
      for (const photo of photoFiles) {
        const fileValidation = validateFileUpload(photo);
        if (!fileValidation.isValid) {
          logger.logSecurityEvent('invalid_file_upload', {
            requestId,
            metadata: {
              filename: photo.originalFilename,
              mimetype: photo.mimetype,
              size: photo.size,
              error: fileValidation.error
            }
          });
          
          timer.end(400);
          return res.status(400).json({
            success: false,
            error: `Invalid photo file: ${fileValidation.error}`
          });
        }
        
        validatedPhotos.push({
          file: photo,
          newFilename: generateSecureFilename(photo.originalFilename || 'upload.jpg')
        });
      }
    }

    // Store quote request in database (if enabled)
    let quoteId: string | undefined;
    if (config.features.databaseEnabled) {
      try {
        const result = await withDatabase(async (db) => {
          return await db.createQuote({
            fullName: validatedData.fullName,
            email: validatedData.email,
            phone: validatedData.phone,
            service: validatedData.service,
            details: validatedData.details,
            photoFilenames: validatedPhotos.map(p => p.newFilename),
            photoUrls: validatedPhotos.map(p => p.file.filepath),
            status: 'pending',
            priority: 'medium',
            ipAddress: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            requestId,
          });
        });

        if (result.success) {
          quoteId = result.data.id;
          logger.info('Quote request stored in database', {
            requestId,
            metadata: { quoteId, service: validatedData.service, photoCount: validatedPhotos.length }
          });
        } else {
          logger.error('Failed to store quote request in database', {
            requestId,
            error: new Error(result.error)
          });
        }
      } catch (error) {
        logger.error('Database operation failed', {
          requestId,
          error: error instanceof Error ? error : new Error(String(error))
        });
        // Continue with email sending even if database fails
      }
    }

    // Prepare email with photo attachments
    const emailAttachments = validatedPhotos.map(photo => ({
      filename: photo.file.originalFilename || photo.newFilename,
      path: photo.file.filepath,
      contentType: photo.file.mimetype || 'image/jpeg'
    }));

    // Format service name for display
    const serviceDisplayNames: Record<string, string> = {
      'concrete-asphalt': 'Concrete & Asphalt',
      'landscaping': 'Landscaping',
      'snow-ice-removal': 'Snow & Ice Removal',
      'painting': 'Painting',
      'demolition': 'Demolition'
    };

    const serviceDisplayName = serviceDisplayNames[validatedData.service] || validatedData.service;

    // Send notification email (async if queue is enabled)
    try {
      const emailJobId = await emailService.sendTemplateEmail(
        'quote-requested',
        [config.email.fromAddress],
        {
          fullName: validatedData.fullName,
          email: validatedData.email,
          phone: validatedData.phone,
          service: serviceDisplayName,
          details: validatedData.details,
          photoCount: validatedPhotos.length,
          quoteId: quoteId || 'unknown',
          submittedAt: new Date().toISOString(),
        },
        {
          attachments: emailAttachments,
          priority: 'normal',
          async: config.email.queueEnabled
        }
      );

      logger.info('Quote request notification email queued', {
        requestId,
        metadata: { 
          emailJobId, 
          quoteId, 
          service: validatedData.service,
          photoCount: validatedPhotos.length 
        }
      });

    } catch (error) {
      logger.error('Failed to send quote request notification email', {
        requestId,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { quoteId, service: validatedData.service }
      });
      
      // Don't fail the request if email fails
      // Return success but log the issue for monitoring
    }

    // Track business metrics
    trackBusinessMetric('quote_requested', {
      requestId,
      quoteId,
      service: validatedData.service,
      email: validatedData.email,
      photoCount: validatedPhotos.length,
      detailsLength: validatedData.details.length
    });

    // Cache successful submission count by service (for analytics)
    if (config.features.cacheEnabled) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `quotes:count:${validatedData.service}:${today}`;
        const currentCount = Number(await cache.getCachedQuery('daily_quotes_by_service', {
          service: validatedData.service,
          date: today,
        }) || 0);

        await cache.cacheQuery(
          'daily_quotes_by_service', 
          { service: validatedData.service, date: today }, 
          currentCount + 1, 
          86400 // 24 hours
        );
      } catch (error) {
        logger.warn('Failed to update quote count cache', {
          requestId,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }

    // Determine estimated response time based on service type
    const estimatedResponseTimes: Record<string, string> = {
      'concrete-asphalt': '3-5 business days',
      'landscaping': '2-3 business days',
      'snow-ice-removal': '1-2 business days',
      'painting': '2-4 business days',
      'demolition': '3-5 business days'
    };

    const estimatedResponse = estimatedResponseTimes[validatedData.service] || '2-4 business days';

    // Success response
    const response = {
      success: true,
      message: `Quote request submitted successfully! We'll review your ${serviceDisplayName.toLowerCase()} project and provide a detailed quote within ${estimatedResponse}.`,
      quoteId: quoteId || `temp_${requestId}`,
      metadata: {
        submittedAt: new Date().toISOString(),
        service: serviceDisplayName,
        photoCount: validatedPhotos.length,
        estimatedResponse
      }
    };

    timer.end(200);
    res.status(200).json(response);

  } catch (error) {
    logger.error('Quote request submission failed', {
      requestId,
      error: error instanceof Error ? error : new Error(String(error))
    });

    // Track error metrics
    trackBusinessMetric('quote_submission_failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });

    timer.end(500, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to submit quote request. Please try again.',
      requestId,
      ...(appConfig.isDevelopment() && {
        debug: error instanceof Error ? error.message : String(error)
      })
    });
  }
}

// Export with middleware stack
export default withApiVersion('v1')(withMonitoring(quoteHandler));

// Configure Next.js body parser for file uploads
export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};