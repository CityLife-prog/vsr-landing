/**
 * Process Quote Commands - CQRS Implementation
 * Commands for quote processing workflows
 */

import { BaseCommand, CommandResult } from '../../cqrs/Command';
import { QuotePriority } from '../../../domain/quote/Quote';

export class MoveQuoteToReviewCommand extends BaseCommand {
  constructor(
    public readonly quoteId: string,
    correlationId?: string,
    userId?: string
  ) {
    super(correlationId, userId);
  }
}

export class SendQuoteCommand extends BaseCommand {
  constructor(
    public readonly quoteId: string,
    public readonly estimatedValue: number,
    public readonly notes?: string,
    public readonly validUntil?: Date,
    correlationId?: string,
    userId?: string
  ) {
    super(correlationId, userId);
  }
}

export class UpdateQuotePriorityCommand extends BaseCommand {
  constructor(
    public readonly quoteId: string,
    public readonly priority: QuotePriority,
    public readonly reason?: string,
    correlationId?: string,
    userId?: string
  ) {
    super(correlationId, userId);
  }
}

export class RejectQuoteCommand extends BaseCommand {
  constructor(
    public readonly quoteId: string,
    public readonly reason: string,
    public readonly notifyCustomer: boolean = true,
    correlationId?: string,
    userId?: string
  ) {
    super(correlationId, userId);
  }
}

export class AcceptQuoteCommand extends BaseCommand {
  constructor(
    public readonly quoteId: string,
    public readonly customerSignature?: string,
    public readonly acceptanceDate?: Date,
    correlationId?: string,
    userId?: string
  ) {
    super(correlationId, userId);
  }
}

export interface QuoteProcessingResult {
  quoteId: string;
  newStatus: string;
  message: string;
  nextActions?: string[];
}

export type QuoteProcessingCommandResult = CommandResult<QuoteProcessingResult>;