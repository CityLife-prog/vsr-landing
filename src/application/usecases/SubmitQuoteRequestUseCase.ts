/**
 * Submit Quote Request Use Case - Application Layer
 * Clean Architecture: Orchestrates domain logic and infrastructure
 */

import { Quote } from '../../domain/quote/Quote';
import { QuoteRepository } from '../../domain/quote/QuoteRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { FileStorageService } from '../../domain/services/FileStorageService';
import { DomainEventPublisher } from '../../domain/shared/DomainEventPublisher';
import { Email } from '../../domain/shared/Email';

export interface SubmitQuoteRequestCommand {
  customerName: string;
  email: string;
  phone: string;
  serviceType: string;
  description: string;
  photoFiles?: Array<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

export interface SubmitQuoteRequestResult {
  quoteId: string;
  success: boolean;
  message: string;
}

export class SubmitQuoteRequestUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly notificationService: NotificationService,
    private readonly fileStorageService: FileStorageService,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async execute(command: SubmitQuoteRequestCommand): Promise<SubmitQuoteRequestResult> {
    try {
      // Upload photo attachments if provided
      const photoAttachments: string[] = [];
      if (command.photoFiles && command.photoFiles.length > 0) {
        for (const photoFile of command.photoFiles) {
          const uploadedFile = await this.fileStorageService.uploadFile(
            photoFile.buffer,
            photoFile.filename,
            photoFile.contentType,
            {
              purpose: 'quote-attachment',
              customerEmail: command.email
            }
          );
          photoAttachments.push(uploadedFile.id);
        }
      }

      // Create quote domain entity
      const quote = Quote.create({
        customerName: command.customerName,
        email: command.email,
        phone: command.phone,
        serviceType: command.serviceType,
        description: command.description,
        photoAttachments,
        metadata: command.metadata
      });

      // Save quote
      await this.quoteRepository.save(quote);

      // Publish domain events
      const events = quote.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      quote.markEventsAsCommitted();

      // Send confirmation notifications
      await this.sendNotifications(quote);

      return {
        quoteId: quote.id.toString(),
        success: true,
        message: 'Quote request submitted successfully'
      };

    } catch (error) {
      throw new SubmitQuoteRequestError(
        'Failed to submit quote request',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  private async sendNotifications(quote: Quote): Promise<void> {
    try {
      // Send confirmation email to customer
      await this.notificationService.sendQuoteConfirmationEmail(
        quote.email,
        quote.id.toString()
      );

      // Send notification email to admin
      const adminEmail = Email.create('admin@vsrconstruction.com');
      await this.notificationService.sendQuoteNotificationEmail(
        adminEmail,
        quote.id.toString()
      );
    } catch (error) {
      // Log notification errors but don't fail the use case
      console.error('Failed to send quote notifications:', error);
    }
  }
}

export class SubmitQuoteRequestError extends Error {
  constructor(message: string, public readonly cause: Error) {
    super(message);
    this.name = 'SubmitQuoteRequestError';
  }
}