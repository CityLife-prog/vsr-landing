/**
 * Cache Provider Interface - Infrastructure Layer
 * Cloud-ready caching abstraction for multiple cache providers
 */

export interface CacheProvider {
  // Basic operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  
  // Batch operations
  mget<T>(keys: string[]): Promise<Map<string, T>>;
  mset<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void>;
  mdel(keys: string[]): Promise<number>;
  
  // Pattern operations
  keys(pattern: string): Promise<string[]>;
  deletePattern(pattern: string): Promise<number>;
  
  // TTL operations
  expire(key: string, ttlSeconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
  
  // Increment/Decrement
  increment(key: string, amount?: number): Promise<number>;
  decrement(key: string, amount?: number): Promise<number>;
  
  // Hash operations
  hget<T>(key: string, field: string): Promise<T | null>;
  hset<T>(key: string, field: string, value: T): Promise<void>;
  hdel(key: string, field: string): Promise<boolean>;
  hgetall<T>(key: string): Promise<Map<string, T>>;
  
  // List operations
  lpush<T>(key: string, value: T): Promise<number>;
  rpush<T>(key: string, value: T): Promise<number>;
  lpop<T>(key: string): Promise<T | null>;
  rpop<T>(key: string): Promise<T | null>;
  llen(key: string): Promise<number>;
  
  // Set operations
  sadd<T>(key: string, value: T): Promise<number>;
  srem<T>(key: string, value: T): Promise<number>;
  smembers<T>(key: string): Promise<T[]>;
  sismember<T>(key: string, value: T): Promise<boolean>;
  
  // Administrative
  clear(): Promise<void>;
  flush(): Promise<void>;
  ping(): Promise<boolean>;
  info(): Promise<CacheInfo>;
}

export interface CacheInfo {
  provider: CacheProviderType;
  version?: string;
  uptime?: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  stats?: {
    hits: number;
    misses: number;
    hitRate: number;
    operations: number;
  };
  connected: boolean;
  lastActivity: Date;
}

export enum CacheProviderType {
  MEMORY = 'memory',
  REDIS = 'redis',
  MEMCACHED = 'memcached',
  ELASTICACHE = 'elasticache',
  UPSTASH = 'upstash',
  VERCEL_KV = 'vercel_kv'
}

export interface CacheConfig {
  provider: CacheProviderType;
  connectionString?: string;
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  keyPrefix?: string;
  defaultTTL?: number;
  maxMemory?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'random' | 'ttl';
  serialization?: 'json' | 'msgpack' | 'none';
  compression?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  pool?: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
}

export abstract class CacheError extends Error {
  abstract readonly errorCode: string;
  
  constructor(
    message: string,
    public readonly key?: string,
    public readonly operation?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CacheConnectionError extends CacheError {
  readonly errorCode = 'CACHE_CONNECTION_ERROR';
}

export class CacheOperationError extends CacheError {
  readonly errorCode = 'CACHE_OPERATION_ERROR';
}

export class CacheSerializationError extends CacheError {
  readonly errorCode = 'CACHE_SERIALIZATION_ERROR';
}

export class CacheTimeoutError extends CacheError {
  readonly errorCode = 'CACHE_TIMEOUT_ERROR';
}