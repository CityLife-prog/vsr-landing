/**
 * CQRS Query Infrastructure - Application Layer
 * Query side of CQRS pattern for read operations
 */

import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

/**
 * Base Query Interface
 * All queries must implement this interface
 */
export interface Query {
  readonly queryId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;
  readonly userId?: string;
  readonly pagination?: PaginationOptions;
  readonly filters?: Record<string, unknown>;
  readonly sorting?: SortingOptions;
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Sorting Options
 */
export interface SortingOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Base Query Implementation
 */
export abstract class BaseQuery implements Query {
  public readonly queryId: string;
  public readonly timestamp: Date;

  constructor(
    public readonly correlationId?: string,
    public readonly userId?: string,
    public readonly pagination?: PaginationOptions,
    public readonly filters?: Record<string, unknown>,
    public readonly sorting?: SortingOptions
  ) {
    this.queryId = UniqueEntityId.create().toString();
    this.timestamp = new Date();
  }
}

/**
 * Query Handler Interface
 */
export interface QueryHandler<TQuery extends Query, TResult = unknown> {
  handle(query: TQuery): Promise<TResult>;
}

/**
 * Query Dispatcher Interface
 */
export interface QueryDispatcher {
  dispatch<TQuery extends Query, TResult = unknown>(
    query: TQuery
  ): Promise<TResult>;
  
  register<TQuery extends Query, TResult = unknown>(
    queryType: new (...args: unknown[]) => TQuery,
    handler: QueryHandler<TQuery, TResult>
  ): void;
}

/**
 * Paginated Query Result
 */
export interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalPages: number;
}

/**
 * Query Result Interface
 */
export interface QueryResult<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: string;
  queryId: string;
  timestamp: Date;
  executionTimeMs?: number;
}

/**
 * Base Query Result Implementation
 */
export class BaseQueryResult<TData = unknown> implements QueryResult<TData> {
  public readonly timestamp: Date;

  constructor(
    public readonly success: boolean,
    public readonly queryId: string,
    public readonly data?: TData,
    public readonly error?: string,
    public readonly executionTimeMs?: number
  ) {
    this.timestamp = new Date();
  }

  static success<TData>(
    queryId: string,
    data: TData,
    executionTimeMs?: number
  ): BaseQueryResult<TData> {
    return new BaseQueryResult(true, queryId, data, undefined, executionTimeMs);
  }

  static failure<TData>(
    queryId: string,
    error: string,
    executionTimeMs?: number
  ): BaseQueryResult<TData> {
    return new BaseQueryResult(false, queryId, undefined, error, executionTimeMs);
  }
}

/**
 * Read Model Interface
 * Represents optimized data structures for queries
 */
export interface ReadModel {
  readonly id: string;
  readonly version: number;
  readonly lastModified: Date;
}

/**
 * Read Model Repository Interface
 */
export interface ReadModelRepository<TReadModel extends ReadModel> {
  findById(id: string): Promise<TReadModel | null>;
  findMany(criteria: QueryCriteria): Promise<PaginatedResult<TReadModel>>;
  save(readModel: TReadModel): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Query Criteria for flexible queries
 */
export interface QueryCriteria {
  filters?: Record<string, unknown>;
  sorting?: SortingOptions[];
  pagination?: PaginationOptions;
  includes?: string[];
}

/**
 * Query Cache Interface
 */
export interface QueryCache {
  get<TResult>(key: string): Promise<TResult | null>;
  set<TResult>(key: string, value: TResult, ttlSeconds?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
}