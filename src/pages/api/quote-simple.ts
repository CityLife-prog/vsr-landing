import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { withServiceStatusCheck } from '../../middleware/maintenanceMode';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { formType, fullName, email, phone, service, details, contractID, reasonForContact, jobDescription, notes, hasFiles, fileCount } = req.body;

    // Check if this is a VSR team update form
    if (formType === 'vsr_team_update') {
      // VSR team update validation
      if (!fullName || !email || !phone || !reasonForContact) {
        return res.status(400).json({ 
          success: false, 
          message: 'Full name, email, phone, and reason for contact are required' 
        });
      }
    } else {
      // Regular quote form validation
      if (!fullName || !email || !phone || !service || !details) {
        return res.status(400).json({ 
          success: false, 
          message: 'All fields are required' 
        });
      }
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Only save to quote database if it's not a VSR team update
    if (formType !== 'vsr_team_update') {
      const quoteRequestData = {
        fullName,
        email,
        phone,
        serviceClass: 'not-specified', // Simple form doesn't have service class
        service,
        details,
        photoFiles: [], // Simple form doesn't have photo uploads
        ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      // Save to quote requests database
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/quote-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer system_token` // Special system token for internal calls
          },
          body: JSON.stringify(quoteRequestData)
        });
        
        if (response.ok) {
          console.log('Quote request saved to database successfully');
        } else {
          console.error('Failed to save quote request to database:', await response.text());
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Continue with email even if database save fails
      }
    }

    // Send email based on form type
    if (formType === 'vsr_team_update') {
      // VSR Team Update email - Use TEST_EMAIL_RECIPIENT if set, otherwise production emails
      const updateRecipient = process.env.TEST_EMAIL_RECIPIENT || 'marcus@vsrsnow.com';
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: updateRecipient,
        subject: `VSR Team Update - ${contractID || 'No Contract ID'}`,
        text: `VSR Team Update received:

Contract ID: ${contractID || 'No Contract ID provided'}
Customer Name: ${fullName}
Email: ${email}
Phone: ${phone}
Reason for Contact: ${reasonForContact}

Job Description: ${jobDescription || 'Not provided'}

Notes: ${notes || 'No additional notes'}

Files Attached: ${hasFiles ? `Yes (${fileCount} files)` : 'No'}

Submitted at: ${new Date().toISOString()}`,
      });
    } else {
      // Regular quote email - Use TEST_EMAIL_RECIPIENT if set, otherwise production emails
      const quoteRecipients = process.env.TEST_EMAIL_RECIPIENT || 'marcus@vsrsnow.com, zach@vsrsnow.com';
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: quoteRecipients,
        subject: 'New Quote Request',
        text: `New quote request received:

Name: ${fullName}
Email: ${email}
Phone: ${phone}
Service: ${service}
Details: ${details}

Submitted at: ${new Date().toISOString()}`,
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Quote request submitted successfully!' 
    });

  } catch (error) {
    console.error('Quote submission error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit quote request. Please try again.' 
    });
  }
}

// Export with service status middleware - requires emailService module
export default withServiceStatusCheck(handler, 'emailService');