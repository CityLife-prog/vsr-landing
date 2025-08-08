// Quote Update API endpoint with file upload support
// Handles VSR team updates with file attachments

import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import nodemailer from 'nodemailer';
import { withSecurity, validateContentType, validateRequestSize } from '@/lib/middleware';
import { validateFileUpload, generateSecureFilename, secureLog, SECURITY_CONFIG } from '@/lib/security';
import { getRecipientsString } from '@/lib/email-config';

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '30mb',
  },
};

/**
 * Quote Update handler with file support
 */
async function quoteUpdateHandler(req: NextApiRequest, res: NextApiResponse) {
  secureLog('info', 'Quote update request started');

  // Validate content type
  if (!validateContentType(req)) {
    secureLog('warn', 'Invalid content type for quote update');
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
    minFileSize: 0,
    multiples: true,
    maxFileSize: SECURITY_CONFIG.MAX_FILE_SIZE,
    maxTotalFileSize: SECURITY_CONFIG.MAX_TOTAL_UPLOAD_SIZE,
    filter: (part) => {
      if (!part.name?.startsWith('updateFile') && part.name !== 'photos') return true;
      const mimetype = part.mimetype || '';
      const allowedTypes = [
        ...SECURITY_CONFIG.ALLOWED_IMAGE_TYPES,
        ...SECURITY_CONFIG.ALLOWED_DOCUMENT_TYPES
      ];
      return allowedTypes.some(type => type === mimetype);
    }
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      secureLog('error', 'Form parsing failed', { error: err.message });
      return res.status(400).json({ 
        error: 'Failed to process request. Please check file size and format.' 
      });
    }

    // Extract form fields
    const contractID = Array.isArray(fields.contractID) ? fields.contractID[0] : fields.contractID || '';
    const fullName = Array.isArray(fields.fullName) ? fields.fullName[0] : fields.fullName || '';
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email || '';
    const phone = Array.isArray(fields.phone) ? fields.phone[0] : fields.phone || '';
    const jobDescription = Array.isArray(fields.jobDescription) ? fields.jobDescription[0] : fields.jobDescription || '';
    const reasonForContact = Array.isArray(fields.reasonForContact) ? fields.reasonForContact[0] : fields.reasonForContact || '';
    const notes = Array.isArray(fields.notes) ? fields.notes[0] : fields.notes || '';

    // Basic validation
    if (!fullName || !email) {
      return res.status(400).json({ 
        error: 'Name and email are required' 
      });
    }

    // Process uploaded files
    const uploadedFiles: Array<{ filename: string; path: string; contentType: string }> = [];
    
    // Check for files in both 'photos' and 'updateFileX' fields
    const allFiles = { ...files };
    
    for (const [fieldName, fileOrFiles] of Object.entries(allFiles)) {
      if (!fieldName.startsWith('updateFile') && fieldName !== 'photos') continue;
      
      const fileList = Array.isArray(fileOrFiles) ? fileOrFiles : fileOrFiles ? [fileOrFiles] : [];
      
      for (const file of fileList) {
        if (!file || !file.filepath || file.size === 0) continue;

        const fileValidation = validateFileUpload(file);
        if (!fileValidation.isValid) {
          secureLog('warn', 'Update file validation failed', { 
            error: fileValidation.error,
            filename: file.originalFilename,
            mimetype: file.mimetype 
          });
          return res.status(400).json({ 
            error: `File validation failed: ${fileValidation.error}` 
          });
        }

        const secureFilename = generateSecureFilename(file.originalFilename || 'update_file.jpg');
        
        uploadedFiles.push({
          filename: secureFilename,
          path: file.filepath,
          contentType: file.mimetype || 'application/octet-stream'
        });
      }
    }

    secureLog('info', 'Processing quote update', {
      requesterEmail: email,
      contractID: contractID,
      attachmentCount: uploadedFiles.length
    });

    // Save to database first
    const updateRequestData = {
      contractId: contractID || 'No Contract ID',
      customerName: fullName,
      email: email,
      phone: phone,
      reasonForContact: reasonForContact,
      jobDescription: jobDescription,
      notes: notes,
      files: uploadedFiles.map(file => file.filename)
    };

    try {
      // Save to update requests database
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/update-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer system_token'
        },
        body: JSON.stringify(updateRequestData)
      });
    } catch (dbError) {
      console.error('Failed to save update request to database:', dbError);
      // Continue with email even if database save fails
    }

    // Configure secure email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
      secure: true,
      requireTLS: true,
      tls: {
        rejectUnauthorized: true
      }
    });

    try {
      // Send email with attachments
      const emailContent = {
        from: process.env.EMAIL_FROM,
        to: getRecipientsString('applications'), // Use application recipients for updates
        subject: `VSR Team Update - ${contractID || 'New Request'}`,
        text: `VSR Team Update Received:\n\n` +
              `Contract ID: ${contractID || 'Not provided'}\n` +
              `Customer Name: ${fullName}\n` +
              `Email: ${email}\n` +
              `Phone: ${phone}\n` +
              `Reason for Contact: ${reasonForContact}\n\n` +
              `Job Description:\n${jobDescription}\n\n` +
              `Additional Notes:\n${notes}\n\n` +
              `Files attached: ${uploadedFiles.length}\n` +
              `Request received at: ${new Date().toISOString()}`,
        attachments: uploadedFiles,
      };

      await transporter.sendMail(emailContent);
      
      secureLog('info', 'Quote update email sent successfully', {
        requesterEmail: email,
        contractID: contractID,
        attachmentCount: uploadedFiles.length
      });
      
      res.status(200).json({ 
        success: true,
        message: 'Update sent successfully' 
      });
      
    } catch (error) {
      secureLog('error', 'Failed to send update email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requesterEmail: email
      });
      
      res.status(500).json({ 
        error: 'Failed to send update. Please try again.' 
      });
    }
  });
}

export default withSecurity(quoteUpdateHandler);