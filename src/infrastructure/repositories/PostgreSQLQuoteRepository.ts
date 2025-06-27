/**
 * PostgreSQL Quote Repository - Infrastructure Layer
 * Cloud-ready PostgreSQL implementation of QuoteRepository
 */

import { Quote, QuoteStatus, QuotePriority } from '../../domain/quote/Quote';
import { QuoteRepository, QuoteQueryFilters, QuoteQueryResult } from '../../domain/quote/QuoteRepository';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';
import { Email } from '../../domain/shared/Email';
import { PhoneNumber } from '../../domain/shared/PhoneNumber';
import { ServiceType } from '../../domain/shared/ServiceType';
import { BaseRepository, FilterParams, FilterOperator, SortingParams, PaginationParams } from '../database/Repository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface QuoteRow {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  service_type: string;
  description: string;
  status: string;
  priority: string;
  photo_attachments: string;
  submitted_at: Date;
  updated_at: Date;
  estimated_value?: number;
  quote_sent_at?: Date;
  expires_at?: Date;
  ip_address?: string;
  user_agent?: string;
  source: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export class PostgreSQLQuoteRepository implements QuoteRepository {
  private baseRepository: BaseRepository<Quote, UniqueEntityId>;
  
  constructor(private connection: DatabaseConnection) {
    this.baseRepository = new class extends BaseRepository<Quote, UniqueEntityId> {
      constructor() {
        super({
          tableName: 'quotes',
          primaryKey: 'id',
          connection,
          useTransactions: true
        });
      }

      toDomainEntity(row: Record<string, unknown>): Quote {
        const quoteRow = row as unknown as QuoteRow;
        
        const email = Email.create(quoteRow.email);
        const phone = PhoneNumber.create(quoteRow.phone);
        const serviceType = ServiceType.create(quoteRow.service_type);
        
        const photoAttachments = quoteRow.photo_attachments 
          ? JSON.parse(quoteRow.photo_attachments) as string[]
          : [];

        const metadata = {
          ipAddress: quoteRow.ip_address,
          userAgent: quoteRow.user_agent,
          source: quoteRow.source,
          utmSource: quoteRow.utm_source,
          utmMedium: quoteRow.utm_medium,
          utmCampaign: quoteRow.utm_campaign
        };

        const props = {
          customerName: quoteRow.customer_name,
          email,
          phone,
          serviceType,
          description: quoteRow.description,
          status: quoteRow.status as QuoteStatus,
          priority: quoteRow.priority as QuotePriority,
          photoAttachments,
          submittedAt: quoteRow.submitted_at,
          updatedAt: quoteRow.updated_at,
          estimatedValue: quoteRow.estimated_value,
          quoteSentAt: quoteRow.quote_sent_at,
          expiresAt: quoteRow.expires_at,
          metadata
        };

        return Quote.reconstitute(UniqueEntityId.create(quoteRow.id), props);
      }

      toPersistenceModel(entity: Quote): Record<string, unknown> {
        return {
          id: entity.id.toString(),
          customer_name: entity.customerName,
          email: entity.email.value,
          phone: entity.phone.value,
          service_type: entity.serviceType.key,
          description: entity.description,
          status: entity.status,
          priority: entity.priority,
          photo_attachments: JSON.stringify(Array.from(entity.photoAttachments)),
          submitted_at: entity.submittedAt,
          updated_at: entity.updatedAt,
          estimated_value: entity.estimatedValue,
          quote_sent_at: entity.quoteSentAt,
          expires_at: entity.expiresAt,
          ip_address: entity.metadata.ipAddress,
          user_agent: entity.metadata.userAgent,
          source: entity.metadata.source,
          utm_source: entity.metadata.utmSource,
          utm_medium: entity.metadata.utmMedium,
          utm_campaign: entity.metadata.utmCampaign
        };
      }

      getEntityId(entity: Quote): UniqueEntityId {
        return entity.id;
      }
    };
  }

  // QuoteRepository interface implementations
  async save(quote: Quote): Promise<void> {
    await this.baseRepository.save(quote);
  }

  async findById(id: UniqueEntityId): Promise<Quote | null> {
    return this.baseRepository.findById(id);
  }

  async findByEmail(email: string): Promise<Quote[]> {
    const filters: FilterParams[] = [{
      field: 'email',
      operator: FilterOperator.EQUALS,
      value: email.toLowerCase()
    }];

    const result = await this.baseRepository.findMany(filters);
    return result.items;
  }

  async findByStatus(status: QuoteStatus): Promise<Quote[]> {
    const filters: FilterParams[] = [{
      field: 'status',
      operator: FilterOperator.EQUALS,
      value: status
    }];

    const result = await this.baseRepository.findMany(filters);
    return result.items;
  }

  async findByPriority(priority: QuotePriority): Promise<Quote[]> {
    const filters: FilterParams[] = [{
      field: 'priority',
      operator: FilterOperator.EQUALS,
      value: priority
    }];

    const result = await this.baseRepository.findMany(filters);
    return result.items;
  }

  async findExpiredQuotes(): Promise<Quote[]> {
    const filters: FilterParams[] = [
      {
        field: 'expires_at',
        operator: FilterOperator.IS_NOT_NULL,
        value: null
      },
      {
        field: 'expires_at',
        operator: FilterOperator.LESS_THAN,
        value: new Date(),
        logical: 'AND'
      }
    ];

    const result = await this.baseRepository.findMany(filters);
    return result.items;
  }

  async findRecentQuotes(limit: number): Promise<Quote[]> {
    const sorting: SortingParams[] = [{
      field: 'submitted_at',
      direction: 'DESC'
    }];

    const pagination: PaginationParams = {
      page: 1,
      limit
    };

    const result = await this.baseRepository.findMany(undefined, sorting, pagination);
    return result.items;
  }

  async countByStatus(status: QuoteStatus): Promise<number> {
    const filters: FilterParams[] = [{
      field: 'status',
      operator: FilterOperator.EQUALS,
      value: status
    }];

    return this.baseRepository.count(filters);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Quote[]> {
    const filters: FilterParams[] = [{
      field: 'submitted_at',
      operator: FilterOperator.BETWEEN,
      value: [startDate, endDate]
    }];

    const result = await this.baseRepository.findMany(filters);
    return result.items;
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await this.baseRepository.delete(id);
  }

  // Enhanced query method for CQRS
  async findWithFilters(filters: QuoteQueryFilters): Promise<QuoteQueryResult> {
    const filterParams: FilterParams[] = [];
    const sortingParams: SortingParams[] = [];
    const paginationParams: PaginationParams = {
      page: Math.max(1, Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1),
      limit: filters.limit || 20
    };

    // Build filter parameters
    if (filters.status) {
      filterParams.push({
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: filters.status
      });
    }

    if (filters.priority) {
      filterParams.push({
        field: 'priority',
        operator: FilterOperator.EQUALS,
        value: filters.priority,
        logical: 'AND'
      });
    }

    if (filters.serviceType) {
      filterParams.push({
        field: 'service_type',
        operator: FilterOperator.EQUALS,
        value: filters.serviceType,
        logical: 'AND'
      });
    }

    if (filters.customerName) {
      filterParams.push({
        field: 'customer_name',
        operator: FilterOperator.ILIKE,
        value: `%${filters.customerName}%`,
        logical: 'AND'
      });
    }

    if (filters.email) {
      filterParams.push({
        field: 'email',
        operator: FilterOperator.ILIKE,
        value: `%${filters.email}%`,
        logical: 'AND'
      });
    }

    if (filters.submittedAfter) {
      filterParams.push({
        field: 'submitted_at',
        operator: FilterOperator.GREATER_THAN_OR_EQUAL,
        value: filters.submittedAfter,
        logical: 'AND'
      });
    }

    if (filters.submittedBefore) {
      filterParams.push({
        field: 'submitted_at',
        operator: FilterOperator.LESS_THAN_OR_EQUAL,
        value: filters.submittedBefore,
        logical: 'AND'
      });
    }

    if (filters.isExpired !== undefined) {
      if (filters.isExpired) {
        filterParams.push({
          field: 'expires_at',
          operator: FilterOperator.IS_NOT_NULL,
          value: null,
          logical: 'AND'
        });
        filterParams.push({
          field: 'expires_at',
          operator: FilterOperator.LESS_THAN,
          value: new Date(),
          logical: 'AND'
        });
      } else {
        filterParams.push({
          field: 'expires_at',
          operator: FilterOperator.IS_NULL,
          value: null,
          logical: 'AND'
        });
      }
    }

    // Build sorting parameters
    if (filters.orderBy && filters.orderDirection) {
      const fieldMap: Record<string, string> = {
        'submittedAt': 'submitted_at',
        'updatedAt': 'updated_at',
        'customerName': 'customer_name'
      };

      sortingParams.push({
        field: fieldMap[filters.orderBy] || 'submitted_at',
        direction: filters.orderDirection.toUpperCase() as 'ASC' | 'DESC'
      });
    }

    const result = await this.baseRepository.findMany(
      filterParams.length > 0 ? filterParams : undefined,
      sortingParams.length > 0 ? sortingParams : undefined,
      paginationParams
    );

    return {
      quotes: result.items,
      total: result.total,
      hasMore: result.hasNext || false
    };
  }

  // Schema creation method for development/testing
  async createSchema(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS quotes (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        service_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        photo_attachments TEXT DEFAULT '[]',
        submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        estimated_value DECIMAL(10,2),
        quote_sent_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        source VARCHAR(100) NOT NULL DEFAULT 'web',
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Indexes for performance
        CONSTRAINT quotes_status_check CHECK (status IN ('pending', 'under_review', 'quote_sent', 'accepted', 'rejected', 'expired')),
        CONSTRAINT quotes_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
      CREATE INDEX IF NOT EXISTS idx_quotes_priority ON quotes(priority);
      CREATE INDEX IF NOT EXISTS idx_quotes_email ON quotes(email);
      CREATE INDEX IF NOT EXISTS idx_quotes_service_type ON quotes(service_type);
      CREATE INDEX IF NOT EXISTS idx_quotes_submitted_at ON quotes(submitted_at);
      CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at);
      CREATE INDEX IF NOT EXISTS idx_quotes_customer_name ON quotes(customer_name);
    `;

    await this.connection.execute(sql);
  }
}