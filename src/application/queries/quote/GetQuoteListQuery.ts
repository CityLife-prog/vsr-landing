/**
 * Get Quote List Query - CQRS Implementation
 * Query for retrieving paginated quote lists with filtering
 */

import { BaseQuery, PaginationOptions, SortingOptions, PaginatedResult } from '../../cqrs/Query';

export class GetQuoteListQuery extends BaseQuery<GetQuoteListResult> {
  constructor(
    public readonly status?: string,
    public readonly priority?: string,
    public readonly serviceType?: string,
    public readonly customerName?: string,
    public readonly customerEmail?: string,
    public readonly submittedAfter?: Date,
    public readonly submittedBefore?: Date,
    public readonly isExpired?: boolean,
    correlationId?: string,
    userId?: string,
    pagination?: PaginationOptions,
    sorting?: SortingOptions
  ) {
    super(
      correlationId,
      userId,
      pagination || { page: 1, limit: 20 },
      {
        status,
        priority,
        serviceType,
        customerName,
        customerEmail,
        submittedAfter,
        submittedBefore,
        isExpired
      },
      sorting || { field: 'submittedAt', direction: 'desc' }
    );
  }
}

export interface QuoteListItem {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  serviceType: {
    key: string;
    name: string;
    category: string;
  };
  description: string;
  status: string;
  priority: string;
  estimatedValue?: number;
  submittedAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isExpired: boolean;
  photoCount: number;
  confirmationNumber?: string;
}

export type GetQuoteListResult = PaginatedResult<QuoteListItem>;