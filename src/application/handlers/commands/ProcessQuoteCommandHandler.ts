/**
 * Process Quote Command Handler - CQRS Implementation
 * Handles quote processing commands for admin workflows
 */

import { CommandHandler, BaseCommandResult } from '../../cqrs/Command';
import { 
  MoveQuoteToReviewCommand,
  SendQuoteCommand,
  UpdateQuotePriorityCommand,
  RejectQuoteCommand,
  QuoteProcessingResult,
  QuoteProcessingCommandResult 
} from '../../commands/quote/ProcessQuoteCommand';

// Domain imports
import { QuoteRepository } from '../../../domain/quote/QuoteRepository';
import { DomainEventPublisher } from '../../../domain/shared/DomainEventPublisher';
import { UniqueEntityId } from '../../../domain/shared/UniqueEntityId';
import { BusinessRuleViolationError } from '../../../domain/shared/DomainError';

export class MoveQuoteToReviewCommandHandler 
  implements CommandHandler<MoveQuoteToReviewCommand, QuoteProcessingCommandResult> {

  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async handle(command: MoveQuoteToReviewCommand): Promise<QuoteProcessingCommandResult> {
    try {
      const quoteId = UniqueEntityId.create(command.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);
      
      if (!quote) {
        return BaseCommandResult.failure(
          command.commandId,
          [{ field: 'quoteId', message: 'Quote not found', code: 'NOT_FOUND' }],
          'Quote not found'
        );
      }

      quote.moveToReview();
      await this.quoteRepository.save(quote);

      // Publish domain events
      const events = quote.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      quote.markEventsAsCommitted();

      const result: QuoteProcessingResult = {
        quoteId: quote.id.toString(),
        newStatus: quote.status,
        message: 'Quote moved to review successfully',
        nextActions: ['Send quote estimate', 'Reject quote', 'Request more information']
      };

      return BaseCommandResult.success(command.commandId, result);

    } catch (error) {
      return this.handleError(command.commandId, error);
    }
  }

  private handleError(commandId: string, error: unknown): QuoteProcessingCommandResult {
    if (error instanceof BusinessRuleViolationError) {
      return BaseCommandResult.failure(
        commandId,
        [{ field: 'business_rule', message: error.message, code: 'BUSINESS_RULE_VIOLATION' }],
        'Business rule violation'
      );
    }

    return BaseCommandResult.failure(
      commandId,
      [{ field: 'system', message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }],
      'Internal system error'
    );
  }
}

export class SendQuoteCommandHandler 
  implements CommandHandler<SendQuoteCommand, QuoteProcessingCommandResult> {

  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async handle(command: SendQuoteCommand): Promise<QuoteProcessingCommandResult> {
    try {
      // Validation
      if (command.estimatedValue <= 0) {
        return BaseCommandResult.failure(
          command.commandId,
          [{ field: 'estimatedValue', message: 'Estimated value must be greater than 0', code: 'INVALID_VALUE' }],
          'Invalid estimated value'
        );
      }

      const quoteId = UniqueEntityId.create(command.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);
      
      if (!quote) {
        return BaseCommandResult.failure(
          command.commandId,
          [{ field: 'quoteId', message: 'Quote not found', code: 'NOT_FOUND' }],
          'Quote not found'
        );
      }

      quote.sendQuote(command.estimatedValue);
      await this.quoteRepository.save(quote);

      // Publish domain events
      const events = quote.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      quote.markEventsAsCommitted();

      const result: QuoteProcessingResult = {
        quoteId: quote.id.toString(),
        newStatus: quote.status,
        message: `Quote sent successfully with estimate of $${command.estimatedValue}`,
        nextActions: ['Await customer response', 'Follow up', 'Modify quote']
      };

      return BaseCommandResult.success(command.commandId, result);

    } catch (error) {
      return this.handleError(command.commandId, error);
    }
  }

  private handleError(commandId: string, error: unknown): QuoteProcessingCommandResult {
    if (error instanceof BusinessRuleViolationError) {
      return BaseCommandResult.failure(
        commandId,
        [{ field: 'business_rule', message: error.message, code: 'BUSINESS_RULE_VIOLATION' }],
        'Business rule violation'
      );
    }

    return BaseCommandResult.failure(
      commandId,
      [{ field: 'system', message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }],
      'Internal system error'
    );
  }
}

export class UpdateQuotePriorityCommandHandler 
  implements CommandHandler<UpdateQuotePriorityCommand, QuoteProcessingCommandResult> {

  constructor(
    private readonly quoteRepository: QuoteRepository
  ) {}

  async handle(command: UpdateQuotePriorityCommand): Promise<QuoteProcessingCommandResult> {
    try {
      const quoteId = UniqueEntityId.create(command.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);
      
      if (!quote) {
        return BaseCommandResult.failure(
          command.commandId,
          [{ field: 'quoteId', message: 'Quote not found', code: 'NOT_FOUND' }],
          'Quote not found'
        );
      }

      quote.setPriority(command.priority);
      await this.quoteRepository.save(quote);

      const result: QuoteProcessingResult = {
        quoteId: quote.id.toString(),
        newStatus: quote.status,
        message: `Quote priority updated to ${command.priority}`,
        nextActions: ['Continue processing', 'Add notes']
      };

      return BaseCommandResult.success(command.commandId, result);

    } catch (error) {
      return this.handleError(command.commandId, error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleError(commandId: string, _error: unknown): QuoteProcessingCommandResult {
    return BaseCommandResult.failure(
      commandId,
      [{ field: 'system', message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }],
      'Internal system error'
    );
  }
}

export class RejectQuoteCommandHandler 
  implements CommandHandler<RejectQuoteCommand, QuoteProcessingCommandResult> {

  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async handle(command: RejectQuoteCommand): Promise<QuoteProcessingCommandResult> {
    try {
      const quoteId = UniqueEntityId.create(command.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);
      
      if (!quote) {
        return BaseCommandResult.failure(
          command.commandId,
          [{ field: 'quoteId', message: 'Quote not found', code: 'NOT_FOUND' }],
          'Quote not found'
        );
      }

      quote.reject();
      await this.quoteRepository.save(quote);

      // Publish domain events
      const events = quote.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      quote.markEventsAsCommitted();

      const result: QuoteProcessingResult = {
        quoteId: quote.id.toString(),
        newStatus: quote.status,
        message: 'Quote rejected successfully',
        nextActions: ['Archive quote', 'Send rejection notification']
      };

      return BaseCommandResult.success(command.commandId, result);

    } catch (error) {
      return this.handleError(command.commandId, error);
    }
  }

  private handleError(commandId: string, error: unknown): QuoteProcessingCommandResult {
    if (error instanceof BusinessRuleViolationError) {
      return BaseCommandResult.failure(
        commandId,
        [{ field: 'business_rule', message: error.message, code: 'BUSINESS_RULE_VIOLATION' }],
        'Business rule violation'
      );
    }

    return BaseCommandResult.failure(
      commandId,
      [{ field: 'system', message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }],
      'Internal system error'
    );
  }
}