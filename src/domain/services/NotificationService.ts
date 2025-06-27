/**
 * Notification Service Interface - Domain Service
 * Clean Architecture: Domain service for cross-cutting business logic
 */

import { Email } from '../shared/Email';
import { PhoneNumber } from '../shared/PhoneNumber';

export interface EmailNotification {
  to: Email;
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface SMSNotification {
  to: PhoneNumber;
  message: string;
}

export interface NotificationService {
  sendEmail(notification: EmailNotification): Promise<void>;
  sendSMS(notification: SMSNotification): Promise<void>;
  sendQuoteConfirmationEmail(customerEmail: Email, quoteId: string): Promise<void>;
  sendQuoteNotificationEmail(adminEmail: Email, quoteId: string): Promise<void>;
  sendApplicationConfirmationEmail(applicantEmail: Email, applicationId: string): Promise<void>;
  sendApplicationNotificationEmail(adminEmail: Email, applicationId: string): Promise<void>;
  sendInterviewScheduledEmail(applicantEmail: Email, interviewDate: Date): Promise<void>;
}