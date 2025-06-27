/**
 * Console Notification Service - Infrastructure Layer
 * Clean Architecture: Development/testing implementation of notification service
 */

import { 
  NotificationService, 
  EmailNotification, 
  SMSNotification 
} from '../../domain/services/NotificationService';
import { Email } from '../../domain/shared/Email';
import { PhoneNumber } from '../../domain/shared/PhoneNumber';

export class ConsoleNotificationService implements NotificationService {
  async sendEmail(notification: EmailNotification): Promise<void> {
    console.log('📧 Email Notification:', {
      to: notification.to.value,
      subject: notification.subject,
      body: notification.body,
      hasHtmlBody: !!notification.htmlBody,
      attachmentCount: notification.attachments?.length || 0,
      timestamp: new Date().toISOString()
    });
  }

  async sendSMS(notification: SMSNotification): Promise<void> {
    console.log('📱 SMS Notification:', {
      to: notification.to.formatted,
      message: notification.message,
      timestamp: new Date().toISOString()
    });
  }

  async sendQuoteConfirmationEmail(customerEmail: Email, quoteId: string): Promise<void> {
    const notification: EmailNotification = {
      to: customerEmail,
      subject: 'Quote Request Received - VSR Construction',
      body: `Thank you for your quote request (ID: ${quoteId}). We will review your request and respond within 2-3 business days.`,
      htmlBody: `
        <h2>Quote Request Received</h2>
        <p>Thank you for your quote request!</p>
        <p><strong>Quote ID:</strong> ${quoteId}</p>
        <p>We will review your request and respond within 2-3 business days.</p>
        <p>Best regards,<br>VSR Construction Team</p>
      `
    };

    await this.sendEmail(notification);
  }

  async sendQuoteNotificationEmail(adminEmail: Email, quoteId: string): Promise<void> {
    const notification: EmailNotification = {
      to: adminEmail,
      subject: `New Quote Request - ${quoteId}`,
      body: `A new quote request has been submitted. Quote ID: ${quoteId}. Please review in the admin dashboard.`,
      htmlBody: `
        <h2>New Quote Request</h2>
        <p>A new quote request has been submitted.</p>
        <p><strong>Quote ID:</strong> ${quoteId}</p>
        <p>Please review in the admin dashboard.</p>
      `
    };

    await this.sendEmail(notification);
  }

  async sendApplicationConfirmationEmail(applicantEmail: Email, applicationId: string): Promise<void> {
    const notification: EmailNotification = {
      to: applicantEmail,
      subject: 'Job Application Received - VSR Construction',
      body: `Thank you for your job application (ID: ${applicationId}). We will review your application and contact you within 1-2 weeks.`,
      htmlBody: `
        <h2>Job Application Received</h2>
        <p>Thank you for your interest in joining VSR Construction!</p>
        <p><strong>Application ID:</strong> ${applicationId}</p>
        <p>We will review your application and contact you within 1-2 weeks.</p>
        <p>Best regards,<br>VSR Construction HR Team</p>
      `
    };

    await this.sendEmail(notification);
  }

  async sendApplicationNotificationEmail(adminEmail: Email, applicationId: string): Promise<void> {
    const notification: EmailNotification = {
      to: adminEmail,
      subject: `New Job Application - ${applicationId}`,
      body: `A new job application has been submitted. Application ID: ${applicationId}. Please review in the admin dashboard.`,
      htmlBody: `
        <h2>New Job Application</h2>
        <p>A new job application has been submitted.</p>
        <p><strong>Application ID:</strong> ${applicationId}</p>
        <p>Please review in the admin dashboard.</p>
      `
    };

    await this.sendEmail(notification);
  }

  async sendInterviewScheduledEmail(applicantEmail: Email, interviewDate: Date): Promise<void> {
    const notification: EmailNotification = {
      to: applicantEmail,
      subject: 'Interview Scheduled - VSR Construction',
      body: `Your interview has been scheduled for ${interviewDate.toLocaleDateString()} at ${interviewDate.toLocaleTimeString()}. We look forward to meeting you!`,
      htmlBody: `
        <h2>Interview Scheduled</h2>
        <p>Your interview with VSR Construction has been scheduled.</p>
        <p><strong>Date:</strong> ${interviewDate.toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${interviewDate.toLocaleTimeString()}</p>
        <p>We look forward to meeting you!</p>
        <p>Best regards,<br>VSR Construction HR Team</p>
      `
    };

    await this.sendEmail(notification);
  }
}