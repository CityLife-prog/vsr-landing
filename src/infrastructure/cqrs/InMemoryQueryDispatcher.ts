/**
 * In-Memory Query Dispatcher - CQRS Infrastructure
 * Routes queries to appropriate handlers with caching support
 */

import { 
  Query, 
  QueryHandler, 
  QueryDispatcher,
  QueryCache
} from '../../application/cqrs/Query';

export class InMemoryQueryDispatcher implements QueryDispatcher {
  private handlers = new Map<string, QueryHandler<Query, unknown>>();
  private cache?: QueryCache;

  constructor(cache?: QueryCache) {
    this.cache = cache;
  }

  register<TQuery extends Query, TResult = unknown>(
    queryType: new (...args: unknown[]) => TQuery,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    const queryName = queryType.name;
    this.handlers.set(queryName, handler as QueryHandler<Query, unknown>);
  }

  async dispatch<TQuery extends Query, TResult = unknown>(
    query: TQuery
  ): Promise<TResult> {
    const queryName = query.constructor.name;
    const handler = this.handlers.get(queryName);

    if (!handler) {
      throw new Error(`No handler registered for query: ${queryName}`);
    }

    // Check cache first if available
    if (this.cache && this.isCacheable(query)) {
      const cacheKey = this.generateCacheKey(query);
      const cachedResult = await this.cache.get<TResult>(cacheKey);
      
      if (cachedResult) {
        console.log(`Cache hit for query: ${queryName}`);
        return cachedResult;
      }
    }

    // Execute query
    const result = await handler.handle(query) as TResult;

    // Cache result if applicable
    if (this.cache && this.isCacheable(query) && result) {
      const cacheKey = this.generateCacheKey(query);
      await this.cache.set(cacheKey, result, this.getCacheTTL(query));
    }

    return result;
  }

  private isCacheable(query: Query): boolean {
    // Add logic to determine if query should be cached
    // For example, exclude real-time queries or user-specific queries
    const nonCacheableQueries = ['GetRealtimeQuoteStatusQuery', 'GetUserSessionQuery'];
    return !nonCacheableQueries.includes(query.constructor.name);
  }

  private generateCacheKey(query: Query): string {
    const queryName = query.constructor.name;
    const queryData = JSON.stringify({
      filters: query.filters,
      pagination: query.pagination,
      sorting: query.sorting
    });
    
    return `query:${queryName}:${Buffer.from(queryData).toString('base64')}`;
  }

  private getCacheTTL(query: Query): number {
    // Different TTL for different query types
    const ttlMap: Record<string, number> = {
      'GetQuoteListQuery': 300, // 5 minutes
      'GetServiceTypesQuery': 3600, // 1 hour
      'GetQuoteDetailsQuery': 60, // 1 minute
      'GetApplicationListQuery': 300 // 5 minutes
    };

    return ttlMap[query.constructor.name] || 300; // Default 5 minutes
  }

  getRegisteredQueries(): string[] {
    return Array.from(this.handlers.keys());
  }

  hasHandler(queryName: string): boolean {
    return this.handlers.has(queryName);
  }

  clear(): void {
    this.handlers.clear();
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidate(pattern);
    }
  }
}