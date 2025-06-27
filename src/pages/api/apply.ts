// Secure job application API endpoint
// SECURITY: Implements comprehensive input validation, file upload restrictions, and rate limiting

import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { IncomingForm } from 'formidable';
import { withSecurity, validateContentType, validateRequestSize } from '@/lib/middleware';
import { validateFileUpload, generateSecureFilename, secureLog, SECURITY_CONFIG } from '@/lib/security';
import { validateApplicationData, type ApplicationData } from '@/lib/validation';

export const config = {
  api: {
    bodyParser: false,
    // Increased size limit but will be validated in middleware
    sizeLimit: '10mb',
  },
};

/**
 * Secure job application handler
 * SECURITY FEATURES:
 * - Input validation and sanitization
 * - File upload restrictions (type, size, name)
 * - Rate limiting (5 requests per 15 minutes per IP)
 * - Email injection prevention
 * - Secure error handling
 * - Comprehensive logging
 */
async function applyHandler(req: NextApiRequest, res: NextApiResponse) {
  secureLog('info', 'Application submission started');

  // Validate content type
  if (!validateContentType(req)) {
    secureLog('warn', 'Invalid content type for application upload');
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
    minFileSize: 1024, // Minimum 1KB
    maxFileSize: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxTotalFileSize: SECURITY_CONFIG.MAX_TOTAL_UPLOAD_SIZE,
    // SECURITY: Restrict to document types only for resumes
    filter: (part) => {
      if (part.name !== 'resume') return true;
      const mimetype = part.mimetype || '';
      return SECURITY_CONFIG.ALLOWED_DOCUMENT_TYPES.some(type => type === mimetype);
    }
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      secureLog('error', 'Form parsing failed', { error: err.message });
      return res.status(400).json({ 
        error: 'Failed to process application. Please check file size and format.' 
      });
    }

    // Validate form data
    const validation = validateApplicationData(fields);
    if (!validation.isValid) {
      secureLog('warn', 'Application validation failed', { errors: validation.errors });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.errors 
      });
    }

    const validatedData = validation.data as ApplicationData;

    // Validate resume file
    const resume = files.resume;
    if (!resume) {
      secureLog('warn', 'Resume file missing in application');
      return res.status(400).json({ 
        error: 'Resume file is required' 
      });
    }

    const resumeFile = Array.isArray(resume) ? resume[0] : resume;
    
    // SECURITY: Comprehensive file validation
    const fileValidation = validateFileUpload(resumeFile);
    if (!fileValidation.isValid) {
      secureLog('warn', 'Resume file validation failed', { 
        error: fileValidation.error,
        filename: resumeFile.originalFilename,
        mimetype: resumeFile.mimetype 
      });
      return res.status(400).json({ 
        error: fileValidation.error 
      });
    }

    // Generate secure filename
    const secureFilename = generateSecureFilename(resumeFile.originalFilename || 'resume.pdf');
    
    secureLog('info', 'Processing application submission', {
      applicantEmail: validatedData.email,
      fileSize: resumeFile.size,
      originalFilename: resumeFile.originalFilename
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
      // SECURITY: Use sanitized data for email content
      const emailContent = {
        from: process.env.EMAIL_FROM,
        to: 'marcus@vsrsnow.com',
        // SECURITY: Prevent email injection by using template
        subject: 'New Job Application Received',
        text: `A new job application has been received:\n\n` +
              `Name: ${validatedData.name}\n` +
              `Email: ${validatedData.email}\n` +
              `Phone: ${validatedData.phone}\n\n` +
              `Experience:\n${validatedData.experience}\n\n` +
              `Application received at: ${new Date().toISOString()}`,
        attachments: [
          {
            filename: secureFilename,
            path: resumeFile.filepath,
            contentType: resumeFile.mimetype || 'application/octet-stream'
          },
        ],
      };

      await transporter.sendMail(emailContent);
      
      secureLog('info', 'Application email sent successfully', {
        applicantEmail: validatedData.email
      });
      
      res.status(200).json({ 
        success: true,
        message: 'Application submitted successfully' 
      });
      
    } catch (error) {
      secureLog('error', 'Failed to send application email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicantEmail: validatedData.email
      });
      
      res.status(500).json({ 
        error: 'Failed to submit application. Please try again.' 
      });
    }    
  });
}

// Export the secured handler
export default withSecurity(applyHandler);