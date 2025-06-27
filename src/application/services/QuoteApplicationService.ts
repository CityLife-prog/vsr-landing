/**
 * Quote Application Service - CQRS Application Layer
 * High-level service that orchestrates commands and queries for quote operations
 */

import { CommandDispatcher } from '../cqrs/Command';
import { QueryDispatcher } from '../cqrs/Query';

// Commands
import { 
  SubmitQuoteRequestCommand, 
  SubmitQuoteRequestCommandResult 
} from '../commands/quote/SubmitQuoteRequestCommand';
import { 
  MoveQuoteToReviewCommand,
  SendQuoteCommand,
  UpdateQuotePriorityCommand,
  RejectQuoteCommand,
  AcceptQuoteCommand,
  QuoteProcessingCommandResult 
} from '../commands/quote/ProcessQuoteCommand';

// Queries
import { GetQuoteListQuery, GetQuoteListResult } from '../queries/quote/GetQuoteListQuery';
import { GetQuoteDetailsQuery, GetQuoteDetailsResult } from '../queries/quote/GetQuoteDetailsQuery';
import { BaseQueryResult, PaginationOptions, SortingOptions } from '../cqrs/Query';
import { QuotePriority } from '../../domain/quote/Quote';

export interface SubmitQuoteRequestRequest {
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
  correlationId?: string;
  userId?: string;
}

export interface QuoteListRequest {
  status?: string;
  priority?: string;
  serviceType?: string;
  customerName?: string;
  customerEmail?: string;
  submittedAfter?: Date;
  submittedBefore?: Date;
  isExpired?: boolean;
  page?: number;
  limit?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  correlationId?: string;
  userId?: string;
}

export interface ProcessQuoteRequest {
  quoteId: string;
  correlationId?: string;
  userId?: string;
}

export interface SendQuoteRequest extends ProcessQuoteRequest {
  estimatedValue: number;
  notes?: string;
  validUntil?: Date;
}

export interface UpdateQuotePriorityRequest extends ProcessQuoteRequest {
  priority: QuotePriority;
  reason?: string;
}

export interface RejectQuoteRequest extends ProcessQuoteRequest {
  reason: string;
  notifyCustomer?: boolean;
}

export interface AcceptQuoteRequest extends ProcessQuoteRequest {
  customerSignature?: string;
  acceptanceDate?: Date;
}

export class QuoteApplicationService {
  constructor(
    private readonly commandDispatcher: CommandDispatcher,
    private readonly queryDispatcher: QueryDispatcher
  ) {}

  // Command Operations
  async submitQuoteRequest(request: SubmitQuoteRequestRequest): Promise<SubmitQuoteRequestCommandResult> {
    const command = new SubmitQuoteRequestCommand(
      request.customerName,
      request.email,
      request.phone,
      request.serviceType,
      request.description,
      request.photoFiles,
      request.metadata,
      request.correlationId,
      request.userId
    );

    return await this.commandDispatcher.dispatch(command);
  }

  async moveQuoteToReview(request: ProcessQuoteRequest): Promise<QuoteProcessingCommandResult> {
    const command = new MoveQuoteToReviewCommand(
      request.quoteId,
      request.correlationId,
      request.userId
    );

    return await this.commandDispatcher.dispatch(command);
  }

  async sendQuote(request: SendQuoteRequest): Promise<QuoteProcessingCommandResult> {
    const command = new SendQuoteCommand(
      request.quoteId,
      request.estimatedValue,
      request.notes,
      request.validUntil,
      request.correlationId,
      request.userId
    );

    return await this.commandDispatcher.dispatch(command);
  }

  async updateQuotePriority(request: UpdateQuotePriorityRequest): Promise<QuoteProcessingCommandResult> {
    const command = new UpdateQuotePriorityCommand(
      request.quoteId,
      request.priority,
      request.reason,
      request.correlationId,
      request.userId
    );

    return await this.commandDispatcher.dispatch(command);
  }

  async rejectQuote(request: RejectQuoteRequest): Promise<QuoteProcessingCommandResult> {
    const command = new RejectQuoteCommand(
      request.quoteId,
      request.reason,
      request.notifyCustomer ?? true,
      request.correlationId,
      request.userId
    );

    return await this.commandDispatcher.dispatch(command);
  }

  async acceptQuote(request: AcceptQuoteRequest): Promise<QuoteProcessingCommandResult> {
    const command = new AcceptQuoteCommand(
      request.quoteId,
      request.customerSignature,
      request.acceptanceDate,
      request.correlationId,
      request.userId
    );

    return await this.commandDispatcher.dispatch(command);
  }

  // Query Operations
  async getQuoteList(request: QuoteListRequest): Promise<BaseQueryResult<GetQuoteListResult>> {
    const pagination: PaginationOptions = {
      page: request.page || 1,
      limit: request.limit || 20
    };

    const sorting: SortingOptions = {
      field: request.sortField || 'submittedAt',
      direction: request.sortDirection || 'desc'
    };

    const query = new GetQuoteListQuery(
      request.status,
      request.priority,
      request.serviceType,
      request.customerName,
      request.customerEmail,
      request.submittedAfter,
      request.submittedBefore,
      request.isExpired,
      request.correlationId,
      request.userId,
      pagination,
      sorting
    );

    return await this.queryDispatcher.dispatch(query);
  }

  async getQuoteDetails(
    quoteId: string, 
    correlationId?: string, 
    userId?: string
  ): Promise<BaseQueryResult<GetQuoteDetailsResult>> {
    const query = new GetQuoteDetailsQuery(quoteId, correlationId, userId);
    return await this.queryDispatcher.dispatch(query);
  }

  // Convenience Methods
  async getQuotesByStatus(
    status: string,
    page: number = 1,
    limit: number = 20
  ): Promise<BaseQueryResult<GetQuoteListResult>> {
    return this.getQuoteList({ status, page, limit });
  }

  async getQuotesByPriority(
    priority: string,
    page: number = 1,
    limit: number = 20
  ): Promise<BaseQueryResult<GetQuoteListResult>> {
    return this.getQuoteList({ priority, page, limit });
  }

  async getRecentQuotes(
    limit: number = 10
  ): Promise<BaseQueryResult<GetQuoteListResult>> {
    return this.getQuoteList({ 
      limit, 
      sortField: 'submittedAt', 
      sortDirection: 'desc' 
    });
  }

  async searchQuotesByCustomer(
    customerName: string,
    page: number = 1,
    limit: number = 20
  ): Promise<BaseQueryResult<GetQuoteListResult>> {
    return this.getQuoteList({ customerName, page, limit });
  }
}