/**
 * In-Memory Query Cache - CQRS Infrastructure
 * Simple memory-based cache for query results
 */

import { QueryCache } from '../../application/cqrs/Query';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export class InMemoryQueryCache implements QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL = 300; // 5 minutes in seconds

  async get<TResult>(key: string): Promise<TResult | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as TResult;
  }

  async set<TResult>(key: string, value: TResult, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.defaultTTL;
    const now = Date.now();
    
    const entry: CacheEntry<TResult> = {
      value,
      expiresAt: now + (ttl * 1000),
      createdAt: now
    };

    this.cache.set(key, entry);
    
    // Cleanup expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanupExpired();
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Development helpers
  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    size: string;
  } {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      size: `${Math.round(this.cache.size * 0.1)}KB` // Rough estimate
    };
  }

  private cleanupExpired(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get all cache keys (for debugging)
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? Date.now() <= entry.expiresAt : false;
  }
}