/**
 * Memory Cache Provider - Infrastructure Layer
 * High-performance in-memory caching with TTL support
 */

import {
  CacheProvider,
  CacheInfo,
  CacheProviderType,
  CacheConnectionError,
  CacheOperationError,
  CacheSerializationError
} from './CacheProvider';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessedAt: number;
  hitCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  operations: number;
  sets: number;
  gets: number;
  deletes: number;
}

export class MemoryCacheProvider implements CacheProvider {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    operations: 0,
    sets: 0,
    gets: 0,
    deletes: 0
  };
  private readonly maxEntries: number;
  private readonly defaultTTL: number;
  private readonly cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;
  private startTime = Date.now();

  constructor(
    maxEntries: number = 10000,
    defaultTTL: number = 3600,
    cleanupInterval: number = 300000 // 5 minutes
  ) {
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = cleanupInterval;
    this.startCleanupTimer();
  }

  async get<T>(key: string): Promise<T | null> {
    this.stats.operations++;
    this.stats.gets++;

    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessedAt = Date.now();
    entry.hitCount++;
    this.stats.hits++;

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.stats.operations++;
    this.stats.sets++;

    // Enforce memory limits
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const ttl = ttlSeconds || this.defaultTTL;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + (ttl * 1000),
      createdAt: now,
      accessedAt: now,
      hitCount: 0
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    this.stats.operations++;
    this.stats.deletes++;

    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    this.stats.operations++;

    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  async mset<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttlSeconds);
    }
  }

  async mdel(keys: string[]): Promise<number> {
    let deletedCount = 0;

    for (const key of keys) {
      if (await this.delete(key)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async keys(pattern: string): Promise<string[]> {
    this.stats.operations++;

    const regex = this.patternToRegex(pattern);
    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        // Check if not expired
        if (await this.exists(key)) {
          matchingKeys.push(key);
        }
      }
    }

    return matchingKeys;
  }

  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    return this.mdel(keys);
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    this.stats.operations++;

    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    entry.expiresAt = Date.now() + (ttlSeconds * 1000);
    return true;
  }

  async ttl(key: string): Promise<number> {
    this.stats.operations++;

    const entry = this.cache.get(key);
    
    if (!entry) {
      return -2; // Key doesn't exist
    }

    const remaining = entry.expiresAt - Date.now();
    
    if (remaining <= 0) {
      this.cache.delete(key);
      return -2; // Key expired
    }

    return Math.ceil(remaining / 1000);
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    this.stats.operations++;

    const current = await this.get<number>(key);
    const newValue = (current || 0) + amount;
    
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  // Hash operations (stored as nested objects)
  async hget<T>(key: string, field: string): Promise<T | null> {
    const hash = await this.get<Record<string, T>>(key);
    return hash ? (hash[field] || null) : null;
  }

  async hset<T>(key: string, field: string, value: T): Promise<void> {
    const hash = await this.get<Record<string, T>>(key) || {};
    hash[field] = value;
    await this.set(key, hash);
  }

  async hdel(key: string, field: string): Promise<boolean> {
    const hash = await this.get<Record<string, unknown>>(key);
    
    if (!hash || !(field in hash)) {
      return false;
    }

    delete hash[field];
    await this.set(key, hash);
    return true;
  }

  async hgetall<T>(key: string): Promise<Map<string, T>> {
    const hash = await this.get<Record<string, T>>(key);
    const result = new Map<string, T>();

    if (hash) {
      for (const [field, value] of Object.entries(hash)) {
        result.set(field, value);
      }
    }

    return result;
  }

  // List operations (stored as arrays)
  async lpush<T>(key: string, value: T): Promise<number> {
    const list = await this.get<T[]>(key) || [];
    list.unshift(value);
    await this.set(key, list);
    return list.length;
  }

  async rpush<T>(key: string, value: T): Promise<number> {
    const list = await this.get<T[]>(key) || [];
    list.push(value);
    await this.set(key, list);
    return list.length;
  }

  async lpop<T>(key: string): Promise<T | null> {
    const list = await this.get<T[]>(key);
    
    if (!list || list.length === 0) {
      return null;
    }

    const value = list.shift()!;
    await this.set(key, list);
    return value;
  }

  async rpop<T>(key: string): Promise<T | null> {
    const list = await this.get<T[]>(key);
    
    if (!list || list.length === 0) {
      return null;
    }

    const value = list.pop()!;
    await this.set(key, list);
    return value;
  }

  async llen(key: string): Promise<number> {
    const list = await this.get<unknown[]>(key);
    return list ? list.length : 0;
  }

  // Set operations (stored as arrays with uniqueness)
  async sadd<T>(key: string, value: T): Promise<number> {
    const set = await this.get<T[]>(key) || [];
    
    if (!set.includes(value)) {
      set.push(value);
      await this.set(key, set);
      return 1;
    }

    return 0;
  }

  async srem<T>(key: string, value: T): Promise<number> {
    const set = await this.get<T[]>(key);
    
    if (!set) {
      return 0;
    }

    const index = set.indexOf(value);
    
    if (index === -1) {
      return 0;
    }

    set.splice(index, 1);
    await this.set(key, set);
    return 1;
  }

  async smembers<T>(key: string): Promise<T[]> {
    return await this.get<T[]>(key) || [];
  }

  async sismember<T>(key: string, value: T): Promise<boolean> {
    const set = await this.get<T[]>(key);
    return set ? set.includes(value) : false;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.resetStats();
  }

  async flush(): Promise<void> {
    await this.clear();
  }

  async ping(): Promise<boolean> {
    return true; // Memory cache is always available
  }

  async info(): Promise<CacheInfo> {
    const memoryUsed = this.estimateMemoryUsage();
    const uptime = Date.now() - this.startTime;

    return {
      provider: CacheProviderType.MEMORY,
      uptime,
      memory: {
        used: memoryUsed,
        total: this.maxEntries * 1024, // Rough estimate
        percentage: (memoryUsed / (this.maxEntries * 1024)) * 100
      },
      stats: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: this.stats.operations > 0 ? (this.stats.hits / this.stats.operations) * 100 : 0,
        operations: this.stats.operations
      },
      connected: true,
      lastActivity: new Date()
    };
  }

  // Private methods
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessedAt < oldestAccess) {
        oldestAccess = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupInterval);

    // Ensure cleanup timer doesn't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert simple patterns to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[([^\]]+)\]/g, '[$1]');
    
    return new RegExp(`^${regexPattern}$`);
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // String chars are 2 bytes
      size += JSON.stringify(entry.value).length * 2;
      size += 64; // Metadata overhead
    }

    return size;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      operations: 0,
      sets: 0,
      gets: 0,
      deletes: 0
    };
  }

  // Cleanup
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}