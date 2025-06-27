/**
 * In-Memory Quote Repository - Infrastructure Layer
 * Clean Architecture: Infrastructure implements domain interfaces
 * Note: For development/testing - production should use database implementation
 */

import { Quote, QuoteStatus, QuotePriority } from '../../domain/quote/Quote';
import { QuoteRepository, QuoteQueryFilters, QuoteQueryResult } from '../../domain/quote/QuoteRepository';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

export class InMemoryQuoteRepository implements QuoteRepository {
  private quotes = new Map<string, Quote>();

  async save(quote: Quote): Promise<void> {
    this.quotes.set(quote.id.toString(), quote);
  }

  async findById(id: UniqueEntityId): Promise<Quote | null> {
    return this.quotes.get(id.toString()) || null;
  }

  async findByEmail(email: string): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(
      quote => quote.email.value.toLowerCase() === email.toLowerCase()
    );
  }

  async findByStatus(status: QuoteStatus): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(
      quote => quote.status === status
    );
  }

  async findByPriority(priority: QuotePriority): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(
      quote => quote.priority === priority
    );
  }

  async findExpiredQuotes(): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(
      quote => quote.isExpired()
    );
  }

  async findRecentQuotes(limit: number): Promise<Quote[]> {
    return Array.from(this.quotes.values())
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, limit);
  }

  async countByStatus(status: QuoteStatus): Promise<number> {
    return Array.from(this.quotes.values()).filter(
      quote => quote.status === status
    ).length;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(
      quote => quote.submittedAt >= startDate && quote.submittedAt <= endDate
    );
  }

  async delete(id: UniqueEntityId): Promise<void> {
    this.quotes.delete(id.toString());
  }

  async findWithFilters(filters: QuoteQueryFilters): Promise<QuoteQueryResult> {
    let quotes = Array.from(this.quotes.values());

    // Apply filters
    if (filters.status) {
      quotes = quotes.filter(quote => quote.status === filters.status);
    }

    if (filters.priority) {
      quotes = quotes.filter(quote => quote.priority === filters.priority);
    }

    if (filters.serviceType) {
      quotes = quotes.filter(quote => quote.serviceType.key === filters.serviceType);
    }

    if (filters.customerName) {
      quotes = quotes.filter(quote => 
        quote.customerName.toLowerCase().includes(filters.customerName!.toLowerCase())
      );
    }

    if (filters.email) {
      quotes = quotes.filter(quote => 
        quote.email.value.toLowerCase().includes(filters.email!.toLowerCase())
      );
    }

    if (filters.submittedAfter) {
      quotes = quotes.filter(quote => quote.submittedAt >= filters.submittedAfter!);
    }

    if (filters.submittedBefore) {
      quotes = quotes.filter(quote => quote.submittedAt <= filters.submittedBefore!);
    }

    if (filters.isExpired !== undefined) {
      quotes = quotes.filter(quote => quote.isExpired() === filters.isExpired);
    }

    // Apply sorting
    const orderBy = filters.orderBy || 'submittedAt';
    const orderDirection = filters.orderDirection || 'desc';

    quotes.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      switch (orderBy) {
        case 'submittedAt':
          aValue = a.submittedAt.getTime();
          bValue = b.submittedAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
        case 'customerName':
          aValue = a.customerName.toLowerCase();
          bValue = b.customerName.toLowerCase();
          break;
        default:
          aValue = a.submittedAt.getTime();
          bValue = b.submittedAt.getTime();
      }

      if (aValue < bValue) return orderDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return orderDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const total = quotes.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    quotes = quotes.slice(offset, offset + limit);

    return {
      quotes,
      total,
      hasMore: offset + quotes.length < total
    };
  }

  // Development helper methods
  async clear(): Promise<void> {
    this.quotes.clear();
  }

  async count(): Promise<number> {
    return this.quotes.size;
  }
}