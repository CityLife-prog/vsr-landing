// Secure quote request API endpoint
// SECURITY: Implements comprehensive input validation, file upload restrictions, and rate limiting

import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import nodemailer from 'nodemailer';
import { withSecurity, validateContentType, validateRequestSize } from '@/lib/middleware';
import { validateFileUpload, generateSecureFilename, secureLog, SECURITY_CONFIG } from '@/lib/security';
import { validateQuoteData, type QuoteData } from '@/lib/validation';

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '30mb', // Allow larger uploads for project photos
  },
};

/**
 * Secure quote request handler
 * SECURITY FEATURES:
 * - Input validation and sanitization
 * - File upload restrictions (type, size, name)
 * - Rate limiting (5 requests per 15 minutes per IP)
 * - Email injection prevention
 * - Secure error handling
 * - Multiple file upload security
 */
async function quoteHandler(req: NextApiRequest, res: NextApiResponse) {
  secureLog('info', 'Quote request started');

  // Validate content type
  if (!validateContentType(req)) {
    secureLog('warn', 'Invalid content type for quote upload');
    return res.status(400).json({ 
      error: 'Invalid content type. Multipart form data required.' 
    });
  }

  // Validate request size
  const sizeValidation = validateRequestSize(req);
  if (!sizeValidation.isValid) {
    secureLog('warn', 'Request size validation failed', { error: sizeValidation.error });
    return res.status(413).json({ 
      error: sizeValidation.error 
    });
  }

  // Configure secure file upload
  const form = new IncomingForm({
    keepExtensions: true,
    allowEmptyFiles: false,
    minFileSize: 0, // Allow no files for quote requests
    multiples: true,
    maxFileSize: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxTotalFileSize: SECURITY_CONFIG.MAX_TOTAL_UPLOAD_SIZE,
    // SECURITY: Restrict to image types only for project photos
    filter: (part) => {
      if (part.name !== 'photos') return true;
      const mimetype = part.mimetype || '';
      return SECURITY_CONFIG.ALLOWED_IMAGE_TYPES.some(type => type === mimetype);
    }
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      secureLog('error', 'Form parsing failed', { error: err.message });
      return res.status(400).json({ 
        error: 'Failed to process request. Please check file size and format.' 
      });
    }

    // Validate form data
    const validation = validateQuoteData(fields, files);
    if (!validation.success) {
      secureLog('warn', 'Quote validation failed', { errors: validation.errors });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.errors 
      });
    }

    const validatedData = validation.validatedData as QuoteData;

    // Process uploaded photos (optional)
    const photos = files.photos;
    const photoFiles = Array.isArray(photos) ? photos : photos ? [photos] : [];
    
    const validatedAttachments: Array<{ filename: string; path: string; contentType: string }> = [];
    
    // SECURITY: Validate each uploaded file
    for (const photoFile of photoFiles) {
      if (!photoFile || !photoFile.filepath || photoFile.size === 0) {
        continue; // Skip empty files
      }

      const fileValidation = validateFileUpload(photoFile);
      if (!fileValidation.isValid) {
        secureLog('warn', 'Photo file validation failed', { 
          error: fileValidation.error,
          filename: photoFile.originalFilename,
          mimetype: photoFile.mimetype 
        });
        return res.status(400).json({ 
          error: `Photo validation failed: ${fileValidation.error}` 
        });
      }

      // Generate secure filename for each photo
      const secureFilename = generateSecureFilename(photoFile.originalFilename || 'project_photo.jpg');
      
      validatedAttachments.push({
        filename: secureFilename,
        path: photoFile.filepath,
        contentType: photoFile.mimetype || 'image/jpeg'
      });
    }

    secureLog('info', 'Processing quote request', {
      requesterEmail: validatedData.email,
      service: validatedData.service,
      attachmentCount: validatedAttachments.length
    });

    // Configure secure email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
      // Security options
      secure: true,
      requireTLS: true,
      tls: {
        rejectUnauthorized: true
      }
    });

    try {
      // Save to database first
      const quoteRequestData = {
        fullName: validatedData.fullName,
        email: validatedData.email,
        phone: validatedData.phone,
        serviceClass: validatedData.serviceClass || 'commercial',
        service: validatedData.service,
        details: validatedData.details,
        photoFiles: validatedAttachments.map(att => att.filename),
        ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      // Save to quote requests (would be database in production)
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/quote-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer system_token` // Special system token for internal calls
          },
          body: JSON.stringify(quoteRequestData)
        });
      } catch (dbError) {
        console.error('Failed to save quote request to database:', dbError);
        // Continue with email even if database save fails
      }

      // SECURITY: Use sanitized data for email content
      const emailContent = {
        from: process.env.EMAIL_FROM,
        to: 'marcus@vsrsnow.com, zach@vsrsnow.com',
        // SECURITY: Prevent email injection by using template
        subject: 'New Quote Request Received',
        text: `A new quote request has been received:\n\n` +
              `Name: ${validatedData.fullName}\n` +
              `Email: ${validatedData.email}\n` +
              `Phone: ${validatedData.phone}\n` +
              `Service Class: ${validatedData.serviceClass || 'Not specified'}\n` +
              `Service: ${validatedData.service}\n\n` +
              `Project Details:\n${validatedData.details}\n\n` +
              `Photos attached: ${validatedAttachments.length}\n` +
              `Request received at: ${new Date().toISOString()}`,
        attachments: validatedAttachments,
      };

      await transporter.sendMail(emailContent);
      
      secureLog('info', 'Quote email sent successfully', {
        requesterEmail: validatedData.email,
        attachmentCount: validatedAttachments.length
      });
      
      res.status(200).json({ 
        success: true,
        message: 'Quote request submitted successfully' 
      });
      
    } catch (error) {
      secureLog('error', 'Failed to send quote email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requesterEmail: validatedData.email
      });
      
      res.status(500).json({ 
        error: 'Failed to submit quote request. Please try again.' 
      });
    }
  });
}

// Export the secured handler
export default withSecurity(quoteHandler);