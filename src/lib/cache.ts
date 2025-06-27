// Response caching and optimization system
// BACKEND IMPROVEMENT: Performance optimization through intelligent caching

import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';
import { metrics } from './monitoring';

/**
 * Cache configuration interface
 * IMPROVEMENT: Flexible caching strategy configuration
 */
export interface CacheConfig {
  provider: 'memory' | 'redis' | 'file';
  ttl: number; // Time to live in seconds
  maxSize?: number; // Max cache size (entries for memory, bytes for file)
  compress?: boolean;
  prefix?: string;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  fileSystem?: {
    directory: string;
    maxFileSize: number;
  };
}

/**
 * Cache entry interface
 * IMPROVEMENT: Structured cache entry with metadata
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number; // Estimated size in bytes
  metadata?: Record<string, unknown>;
}

/**
 * Cache statistics interface
 * IMPROVEMENT: Cache performance monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  entries: number;
  totalSize: number;
  evictions: number;
  averageAccessTime: number;
}

/**
 * Abstract cache provider interface
 * IMPROVEMENT: Provider-agnostic caching implementation
 */
export abstract class CacheProvider {
  protected config: CacheConfig;
  protected stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    entries: 0,
    totalSize: 0,
    evictions: 0,
    averageAccessTime: 0
  };

  constructor(config: CacheConfig) {
    this.config = config;
  }

  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract keys(pattern?: string): Promise<string[]>;
  abstract size(): Promise<number>;

  public getStats(): CacheStats {
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;
    return { ...this.stats };
  }

  protected incrementHit(): void {
    this.stats.hits++;
    metrics.incrementCounter('cache_hits_total');
  }

  protected incrementMiss(): void {
    this.stats.misses++;
    metrics.incrementCounter('cache_misses_total');
  }

  protected recordAccessTime(time: number): void {
    const currentAvg = this.stats.averageAccessTime;
    const totalAccesses = this.stats.hits + this.stats.misses;
    this.stats.averageAccessTime = totalAccesses > 1 
      ? (currentAvg * (totalAccesses - 1) + time) / totalAccesses
      : time;
    
    metrics.recordHistogram('cache_access_duration_ms', time);
  }
}

/**
 * In-memory cache provider with LRU eviction
 * IMPROVEMENT: High-performance memory caching with intelligent eviction
 */
export class MemoryCacheProvider extends CacheProvider {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU tracking

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.incrementMiss();
        return null;
      }

      if (entry.expiresAt < new Date()) {
        // Expired entry
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.incrementMiss();
        return null;
      }

      // Update access information
      entry.accessCount++;
      entry.lastAccessed = new Date();
      this.updateAccessOrder(key);
      
      this.incrementHit();
      return entry.value as T;
      
    } finally {
      this.recordAccessTime(Date.now() - startTime);
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const effectiveTtl = ttl || this.config.ttl;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + effectiveTtl * 1000);
    
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
      size: this.estimateSize(value),
      metadata: {
        ttl: effectiveTtl,
        compressed: false
      }
    };

    // Check if we need to evict entries
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      await this.evictLRU();
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.updateStats();
    
    logger.debug('Cache entry set', {
      metadata: { key, size: entry.size, ttl: effectiveTtl }
    });
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
      this.updateStats();
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.updateStats();
    logger.info('Cache cleared');
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return allKeys.filter(key => regex.test(key));
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private async evictLRU(): Promise<void> {
    if (this.accessOrder.length === 0) return;
    
    const keyToEvict = this.accessOrder.shift();
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
      
      logger.debug('Cache entry evicted (LRU)', {
        metadata: { key: keyToEvict }
      });
    }
  }

  private estimateSize(value: unknown): number {
    // Rough size estimation
    try {
      return JSON.stringify(value).length * 2; // Approximate UTF-16 encoding
    } catch {
      return 1000; // Default size for non-serializable objects
    }
  }

  private updateStats(): void {
    this.stats.entries = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }
}

/**
 * Cache key generator with intelligent naming
 * IMPROVEMENT: Consistent and collision-resistant cache keys
 */
export class CacheKeyGenerator {
  private prefix: string;

  constructor(prefix: string = 'vsr') {
    this.prefix = prefix;
  }

  /**
   * Generate cache key for API responses
   * IMPROVEMENT: Request-specific cache key generation
   */
  public forApiResponse(req: NextApiRequest): string {
    const parts = [
      this.prefix,
      'api',
      req.method?.toLowerCase() || 'get',
      this.sanitizePath(req.url || ''),
    ];

    // Add query parameters (sorted for consistency)
    const queryKeys = Object.keys(req.query || {}).sort();
    if (queryKeys.length > 0) {
      const queryString = queryKeys
        .map(key => `${key}=${req.query[key]}`)
        .join('&');
      parts.push(this.hashString(queryString));
    }

    return parts.join(':');
  }

  /**
   * Generate cache key for database queries
   * IMPROVEMENT: Query-specific cache key generation
   */
  public forDatabaseQuery(operation: string, params: Record<string, unknown>): string {
    const parts = [
      this.prefix,
      'db',
      operation,
      this.hashString(JSON.stringify(params, Object.keys(params).sort()))
    ];

    return parts.join(':');
  }

  /**
   * Generate cache key for external API calls
   * IMPROVEMENT: External service cache key generation
   */
  public forExternalApi(service: string, endpoint: string, params?: Record<string, unknown>): string {
    const parts = [
      this.prefix,
      'external',
      service,
      this.sanitizePath(endpoint)
    ];

    if (params) {
      parts.push(this.hashString(JSON.stringify(params, Object.keys(params).sort())));
    }

    return parts.join(':');
  }

  /**
   * Generate cache key for user-specific data
   * IMPROVEMENT: User-scoped cache key generation
   */
  public forUser(userId: string, dataType: string, identifier?: string): string {
    const parts = [
      this.prefix,
      'user',
      this.hashString(userId),
      dataType
    ];

    if (identifier) {
      parts.push(identifier);
    }

    return parts.join(':');
  }

  private sanitizePath(path: string): string {
    return path
      .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
      .replace(/\/+/g, '/') // Collapse multiple slashes
      .replace(/[^a-zA-Z0-9\-_\/]/g, '_'); // Replace special chars
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Cache manager with multiple strategies
 * IMPROVEMENT: Intelligent caching with multiple strategies
 */
export class CacheManager {
  private static instance: CacheManager;
  private provider: CacheProvider;
  private keyGenerator: CacheKeyGenerator;
  private config: CacheConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.provider = this.createProvider();
    this.keyGenerator = new CacheKeyGenerator(this.config.prefix);
    
    logger.info('Cache manager initialized', {
      metadata: { provider: this.config.provider, ttl: this.config.ttl }
    });
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private loadConfig(): CacheConfig {
    return {
      provider: (process.env.CACHE_PROVIDER as CacheConfig['provider']) || 'memory',
      ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
      compress: process.env.CACHE_COMPRESS === 'true',
      prefix: process.env.CACHE_PREFIX || 'vsr',
    };
  }

  private createProvider(): CacheProvider {
    switch (this.config.provider) {
      case 'memory':
        return new MemoryCacheProvider(this.config);
      // Could add other providers:
      // case 'redis':
      //   return new RedisCacheProvider(this.config);
      // case 'file':
      //   return new FileCacheProvider(this.config);
      default:
        throw new Error(`Unsupported cache provider: ${this.config.provider}`);
    }
  }

  /**
   * Cache API response with intelligent TTL
   * IMPROVEMENT: Response-specific caching strategy
   */
  public async cacheApiResponse<T>(
    req: NextApiRequest,
    data: T,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    const key = this.keyGenerator.forApiResponse(req);
    const ttl = options.ttl || this.getResponseTTL(req);
    
    await this.provider.set(key, data, ttl);
    
    logger.debug('API response cached', {
      metadata: { key, ttl, tags: options.tags }
    });
  }

  /**
   * Get cached API response
   * IMPROVEMENT: Response cache retrieval with metrics
   */
  public async getCachedApiResponse<T>(req: NextApiRequest): Promise<T | null> {
    const key = this.keyGenerator.forApiResponse(req);
    return await this.provider.get<T>(key);
  }

  /**
   * Cache database query result
   * IMPROVEMENT: Query result caching
   */
  public async cacheQuery<T>(
    operation: string,
    params: Record<string, unknown>,
    result: T,
    ttl?: number
  ): Promise<void> {
    const key = this.keyGenerator.forDatabaseQuery(operation, params);
    await this.provider.set(key, result, ttl);
  }

  /**
   * Get cached query result
   * IMPROVEMENT: Query cache retrieval
   */
  public async getCachedQuery<T>(
    operation: string,
    params: Record<string, unknown>
  ): Promise<T | null> {
    const key = this.keyGenerator.forDatabaseQuery(operation, params);
    return await this.provider.get<T>(key);
  }

  /**
   * Invalidate cache by pattern
   * IMPROVEMENT: Selective cache invalidation
   */
  public async invalidate(pattern: string): Promise<number> {
    const keys = await this.provider.keys(pattern);
    let deletedCount = 0;
    
    for (const key of keys) {
      const deleted = await this.provider.delete(key);
      if (deleted) deletedCount++;
    }

    logger.info('Cache invalidated', {
      metadata: { pattern, deletedCount }
    });

    return deletedCount;
  }

  /**
   * Get cache statistics
   * IMPROVEMENT: Cache performance monitoring
   */
  public getStats(): CacheStats {
    return this.provider.getStats();
  }

  /**
   * Determine appropriate TTL for API responses
   * IMPROVEMENT: Intelligent TTL based on request characteristics
   */
  private getResponseTTL(req: NextApiRequest): number {
    const url = req.url || '';
    
    // Health checks: 30 seconds
    if (url.includes('/health')) return 30;
    
    // Static content: 1 hour
    if (url.includes('/docs') || url.includes('/api-docs')) return 3600;
    
    // Form submissions: No caching
    if (req.method === 'POST') return 0;
    
    // Default: 5 minutes
    return this.config.ttl;
  }

  public getKeyGenerator(): CacheKeyGenerator {
    return this.keyGenerator;
  }

  public async shutdown(): Promise<void> {
    await this.provider.clear();
    logger.info('Cache manager shutdown completed');
  }
}

/**
 * Response caching middleware
 * IMPROVEMENT: Automatic response caching for eligible requests
 */
export function withResponseCache(
  options: { ttl?: number; enabled?: boolean } = {}
) {
  return function(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Skip caching if disabled or for non-GET requests
      if (options.enabled === false || req.method !== 'GET') {
        return handler(req, res);
      }

      const cache = CacheManager.getInstance();
      
      // Try to get cached response
      const cached = await cache.getCachedApiResponse(req);
      if (cached) {
        logger.debug('Serving cached response', {
          metadata: { url: req.url, method: req.method }
        });
        
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${options.ttl || 300}`);
        return res.json(cached);
      }

      // Capture response data
      const originalJson = res.json;
      let responseData: unknown;
      
      res.json = function(data: unknown) {
        responseData = data;
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${options.ttl || 300}`);
        return originalJson.call(this, data);
      };

      await handler(req, res);

      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && responseData) {
        await cache.cacheApiResponse(req, responseData, { ttl: options.ttl });
      }
    };
  };
}

// Export singleton instance
export const cache = CacheManager.getInstance();
export default cache;