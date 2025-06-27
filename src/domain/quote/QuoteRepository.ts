/**
 * Quote Repository Interface - Domain Layer
 * Clean Architecture: Domain defines interfaces, infrastructure implements them
 */

import { Quote, QuoteStatus, QuotePriority } from './Quote';
import { UniqueEntityId } from '../shared/UniqueEntityId';

export interface QuoteRepository {
  save(quote: Quote): Promise<void>;
  findById(id: UniqueEntityId): Promise<Quote | null>;
  findByEmail(email: string): Promise<Quote[]>;
  findByStatus(status: QuoteStatus): Promise<Quote[]>;
  findByPriority(priority: QuotePriority): Promise<Quote[]>;
  findExpiredQuotes(): Promise<Quote[]>;
  findRecentQuotes(limit: number): Promise<Quote[]>;
  countByStatus(status: QuoteStatus): Promise<number>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Quote[]>;
  delete(id: UniqueEntityId): Promise<void>;
}

export interface QuoteQueryFilters {
  status?: QuoteStatus;
  priority?: QuotePriority;
  serviceType?: string;
  customerName?: string;
  email?: string;
  submittedAfter?: Date;
  submittedBefore?: Date;
  isExpired?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'submittedAt' | 'updatedAt' | 'customerName';
  orderDirection?: 'asc' | 'desc';
}

export interface QuoteQueryResult {
  quotes: Quote[];
  total: number;
  hasMore: boolean;
}