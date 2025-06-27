/**
 * Submit Quote Request Command Handler - CQRS Implementation
 * Handles quote submission commands with proper validation and business rules
 */

import { CommandHandler, BaseCommandResult, ValidationError } from '../../cqrs/Command';
import { 
  SubmitQuoteRequestCommand, 
  SubmitQuoteRequestResult,
  SubmitQuoteRequestCommandResult 
} from '../../commands/quote/SubmitQuoteRequestCommand';

// Domain imports
import { Quote } from '../../../domain/quote/Quote';
import { QuoteRepository } from '../../../domain/quote/QuoteRepository';
import { NotificationService } from '../../../domain/services/NotificationService';
import { FileStorageService } from '../../../domain/services/FileStorageService';
import { DomainEventPublisher } from '../../../domain/shared/DomainEventPublisher';
import { DomainValidationError, BusinessRuleViolationError } from '../../../domain/shared/DomainError';

export class SubmitQuoteRequestCommandHandler 
  implements CommandHandler<SubmitQuoteRequestCommand, SubmitQuoteRequestCommandResult> {

  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly notificationService: NotificationService,
    private readonly fileStorageService: FileStorageService,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async handle(command: SubmitQuoteRequestCommand): Promise<SubmitQuoteRequestCommandResult> {
    try {
      // 1. Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        return BaseCommandResult.failure(
          command.commandId,
          validationResult.errors,
          'Command validation failed'
        );
      }

      // 2. Upload photo attachments if provided
      const photoAttachments: string[] = [];
      if (command.photoFiles && command.photoFiles.length > 0) {
        for (const photoFile of command.photoFiles) {
          const uploadedFile = await this.fileStorageService.uploadFile(
            photoFile.buffer,
            photoFile.filename,
            photoFile.contentType,
            {
              purpose: 'quote-attachment',
              customerEmail: command.email,
              commandId: command.commandId
            }
          );
          photoAttachments.push(uploadedFile.id);
        }
      }

      // 3. Create quote domain entity
      const quote = Quote.create({
        customerName: command.customerName,
        email: command.email,
        phone: command.phone,
        serviceType: command.serviceType,
        description: command.description,
        photoAttachments,
        metadata: {
          ipAddress: command.requestMetadata?.ipAddress,
          userAgent: command.requestMetadata?.userAgent,
          source: command.requestMetadata?.source || 'web',
          utmSource: command.requestMetadata?.utmSource,
          utmMedium: command.requestMetadata?.utmMedium,
          utmCampaign: command.requestMetadata?.utmCampaign
        }
      });

      // 4. Save quote
      await this.quoteRepository.save(quote);

      // 5. Publish domain events
      const events = quote.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      quote.markEventsAsCommitted();

      // 6. Generate confirmation number
      const confirmationNumber = this.generateConfirmationNumber(quote.id.toString());

      // 7. Prepare result
      const result: SubmitQuoteRequestResult = {
        quoteId: quote.id.toString(),
        estimatedResponseTime: this.getEstimatedResponseTime(quote.serviceType.key),
        confirmationNumber
      };

      return BaseCommandResult.success(
        command.commandId,
        result,
        'Quote request submitted successfully'
      );

    } catch (error) {
      return this.handleError(command.commandId, error);
    }
  }

  private async validateCommand(command: SubmitQuoteRequestCommand): Promise<{
    isValid: boolean;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];

    // Required field validation
    if (!command.customerName?.trim()) {
      errors.push({
        field: 'customerName',
        message: 'Customer name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!command.email?.trim()) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!command.phone?.trim()) {
      errors.push({
        field: 'phone',
        message: 'Phone number is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!command.serviceType?.trim()) {
      errors.push({
        field: 'serviceType',
        message: 'Service type is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!command.description?.trim()) {
      errors.push({
        field: 'description',
        message: 'Description is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Business rule validation
    if (command.description && command.description.length < 10) {
      errors.push({
        field: 'description',
        message: 'Description must be at least 10 characters',
        code: 'MIN_LENGTH'
      });
    }

    if (command.description && command.description.length > 2000) {
      errors.push({
        field: 'description',
        message: 'Description must not exceed 2000 characters',
        code: 'MAX_LENGTH'
      });
    }

    // Photo validation
    if (command.photoFiles && command.photoFiles.length > 10) {
      errors.push({
        field: 'photoFiles',
        message: 'Maximum 10 photo attachments allowed',
        code: 'MAX_ITEMS'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private generateConfirmationNumber(quoteId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const quoteIdShort = quoteId.substring(0, 8).toUpperCase();
    return `QTE-${timestamp}-${quoteIdShort}`;
  }

  private getEstimatedResponseTime(serviceType: string): string {
    const responseTimeMap: Record<string, string> = {
      'concrete-asphalt': '2-3 business days',
      'landscaping': '3-5 business days',
      'painting': '1-2 business days',
      'demolition': '5-7 business days',
      'snow-ice-removal': '24-48 hours'
    };

    return responseTimeMap[serviceType] || '2-3 business days';
  }

  private handleError(commandId: string, error: unknown): SubmitQuoteRequestCommandResult {
    console.error('SubmitQuoteRequestCommandHandler error:', error);

    if (error instanceof DomainValidationError) {
      return BaseCommandResult.failure(
        commandId,
        [{
          field: error.field,
          message: error.message,
          code: 'DOMAIN_VALIDATION'
        }],
        'Domain validation failed'
      );
    }

    if (error instanceof BusinessRuleViolationError) {
      return BaseCommandResult.failure(
        commandId,
        [{
          field: 'business_rule',
          message: error.message,
          code: 'BUSINESS_RULE_VIOLATION'
        }],
        'Business rule violation'
      );
    }

    return BaseCommandResult.failure(
      commandId,
      [{
        field: 'system',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      }],
      'Internal system error'
    );
  }
}