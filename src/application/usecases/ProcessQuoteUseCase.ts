/**
 * Process Quote Use Case - Application Layer
 * Clean Architecture: Admin operations for quote management
 */

import { Quote, QuoteStatus, QuotePriority } from '../../domain/quote/Quote';
import { QuoteRepository } from '../../domain/quote/QuoteRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { DomainEventPublisher } from '../../domain/shared/DomainEventPublisher';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';
import { BusinessRuleViolationError } from '../../domain/shared/DomainError';

export interface MoveQuoteToReviewCommand {
  quoteId: string;
}

export interface SendQuoteCommand {
  quoteId: string;
  estimatedValue: number;
}

export interface SetQuotePriorityCommand {
  quoteId: string;
  priority: QuotePriority;
}

export interface RejectQuoteCommand {
  quoteId: string;
  reason?: string;
}

export interface ProcessQuoteResult {
  success: boolean;
  message: string;
  quote?: {
    id: string;
    status: QuoteStatus;
    customerName: string;
    serviceType: string;
  };
}

export class ProcessQuoteUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly notificationService: NotificationService,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async moveToReview(command: MoveQuoteToReviewCommand): Promise<ProcessQuoteResult> {
    try {
      const quoteId = UniqueEntityId.create(command.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);
      
      if (!quote) {
        throw new Error('Quote not found');
      }

      quote.moveToReview();
      await this.quoteRepository.save(quote);

      // Publish domain events
      const events = quote.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      quote.markEventsAsCommitted();

      return {
        success: true,
        message: 'Quote moved to review successfully',
        quote: this.mapQuoteToResult(quote)
      };

    } catch (error) {
      if (error instanceof BusinessRuleViolationError) {
        return {
          success: false,
          message: error.message
        };
      }
      throw new ProcessQuoteError('Failed to move quote to review', error as Error);
    }
  }

  async sendQuote(command: SendQuoteCommand): Promise<ProcessQuoteResult> {
    try {
      const quoteId = UniqueEntityId.create(command.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);
      
      if (!quote) {
        throw new Error('Quote not found');
      }

      quote.sendQuote(command.estimatedValue);
      await this.quoteRepository.save(quote);

      // Publish domain events
      const events = quote.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      quote.markEventsAsCommitted();

      return {
        success: true,
        message: 'Quote sent successfully',
        quote: this.mapQuoteToResult(quote)
      };

    } catch (error) {
      if (error instanceof BusinessRuleViolationError) {
        return {
          success: false,
          message: error.message
        };
      }
      throw new ProcessQuoteError('Failed to send quote', error as Error);
    }
  }

  async setPriority(command: SetQuotePriorityCommand): Promise<ProcessQuoteResult> {
    try {
      const quoteId = UniqueEntityId.create(command.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);
      
      if (!quote) {
        throw new Error('Quote not found');
      }

      quote.setPriority(command.priority);
      await this.quoteRepository.save(quote);

      return {
        success: true,
        message: 'Quote priority updated successfully',
        quote: this.mapQuoteToResult(quote)
      };

    } catch (error) {
      throw new ProcessQuoteError('Failed to update quote priority', error as Error);
    }
  }

  async rejectQuote(command: RejectQuoteCommand): Promise<ProcessQuoteResult> {
    try {
      const quoteId = UniqueEntityId.create(command.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);
      
      if (!quote) {
        throw new Error('Quote not found');
      }

      quote.reject();
      await this.quoteRepository.save(quote);

      // Publish domain events
      const events = quote.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      quote.markEventsAsCommitted();

      return {
        success: true,
        message: 'Quote rejected successfully',
        quote: this.mapQuoteToResult(quote)
      };

    } catch (error) {
      if (error instanceof BusinessRuleViolationError) {
        return {
          success: false,
          message: error.message
        };
      }
      throw new ProcessQuoteError('Failed to reject quote', error as Error);
    }
  }

  private mapQuoteToResult(quote: Quote) {
    return {
      id: quote.id.toString(),
      status: quote.status,
      customerName: quote.customerName,
      serviceType: quote.serviceType.key
    };
  }
}

export class ProcessQuoteError extends Error {
  constructor(message: string, public readonly cause: Error) {
    super(message);
    this.name = 'ProcessQuoteError';
  }
}