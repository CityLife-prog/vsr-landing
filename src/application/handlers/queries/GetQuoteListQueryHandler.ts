/**
 * Get Quote List Query Handler - CQRS Implementation
 * Handles quote list queries with filtering and pagination
 */

import { QueryHandler, BaseQueryResult } from '../../cqrs/Query';
import { GetQuoteListQuery, GetQuoteListResult, QuoteListItem } from '../../queries/quote/GetQuoteListQuery';
import { QuoteRepository, QuoteQueryFilters } from '../../../domain/quote/QuoteRepository';
import { QuoteStatus, QuotePriority } from '../../../domain/quote/Quote';

export class GetQuoteListQueryHandler 
  implements QueryHandler<GetQuoteListQuery, BaseQueryResult<GetQuoteListResult>> {

  constructor(
    private readonly quoteRepository: QuoteRepository
  ) {}

  async handle(query: GetQuoteListQuery): Promise<BaseQueryResult<GetQuoteListResult>> {
    const startTime = Date.now();

    try {
      // Build repository filters from query
      const filters: QuoteQueryFilters = {
        limit: query.pagination?.limit || 20,
        offset: query.pagination?.offset || ((query.pagination?.page || 1) - 1) * (query.pagination?.limit || 20),
        orderBy: this.mapSortField(query.sorting?.field),
        orderDirection: query.sorting?.direction || 'desc'
      };

      // Apply filters
      if (query.filters?.status) {
        filters.status = query.filters.status as QuoteStatus;
      }

      if (query.filters?.priority) {
        filters.priority = query.filters.priority as QuotePriority;
      }

      if (query.filters?.serviceType) {
        filters.serviceType = query.filters.serviceType as string;
      }

      if (query.filters?.customerName) {
        filters.customerName = query.filters.customerName as string;
      }

      if (query.filters?.customerEmail) {
        filters.email = query.filters.customerEmail as string;
      }

      if (query.filters?.submittedAfter) {
        filters.submittedAfter = query.filters.submittedAfter as Date;
      }

      if (query.filters?.submittedBefore) {
        filters.submittedBefore = query.filters.submittedBefore as Date;
      }

      if (query.filters?.isExpired !== undefined) {
        filters.isExpired = query.filters.isExpired as boolean;
      }

      // Execute query using repository
      let quotes;
      let total;

      // Use the InMemoryQuoteRepository's findWithFilters method
      if ('findWithFilters' in this.quoteRepository) {
        const result = await (this.quoteRepository as any).findWithFilters(filters);
        quotes = result.quotes;
        total = result.total;
      } else {
        // Fallback for repositories that don't support filtering
        quotes = await this.quoteRepository.findRecentQuotes(filters.limit || 20);
        total = quotes.length;
      }

      // Map domain entities to query result DTOs
      const items: QuoteListItem[] = quotes.map(quote => ({
        id: quote.id.toString(),
        customerName: quote.customerName,
        email: quote.email.value,
        phone: quote.phone.formatted,
        serviceType: {
          key: quote.serviceType.key,
          name: quote.serviceType.name,
          category: quote.serviceType.category
        },
        description: quote.description,
        status: quote.status,
        priority: quote.priority,
        estimatedValue: quote.estimatedValue,
        submittedAt: quote.submittedAt,
        updatedAt: quote.updatedAt,
        expiresAt: quote.expiresAt,
        isExpired: quote.isExpired(),
        photoCount: quote.photoAttachments.length,
        confirmationNumber: this.generateConfirmationNumber(quote.id.toString())
      }));

      const limit = filters.limit || 20;
      const currentPage = Math.floor((filters.offset || 0) / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      const result: GetQuoteListResult = {
        items,
        total,
        page: currentPage,
        limit,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
        totalPages
      };

      const executionTime = Date.now() - startTime;

      return BaseQueryResult.success(query.queryId, result, executionTime);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('GetQuoteListQueryHandler error:', error);
      
      return BaseQueryResult.failure(
        query.queryId,
        'Failed to retrieve quote list',
        executionTime
      );
    }
  }

  private mapSortField(field?: string): 'submittedAt' | 'updatedAt' | 'customerName' {
    const validFields = ['submittedAt', 'updatedAt', 'customerName'] as const;
    return validFields.includes(field as any) ? field as any : 'submittedAt';
  }

  private generateConfirmationNumber(quoteId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const quoteIdShort = quoteId.substring(0, 8).toUpperCase();
    return `QTE-${timestamp}-${quoteIdShort}`;
  }
}