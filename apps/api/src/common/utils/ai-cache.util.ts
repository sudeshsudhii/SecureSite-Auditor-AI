/**
 * ai-cache.util.ts
 * 
 * In-memory LRU response cache for AI analysis results.
 * Prevents redundant API calls for identical scan data.
 * Uses SHA-256 hash of prompt text as cache key with TTL-based expiry.
 */

import { createHash } from 'crypto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp in ms
}

export interface AiCacheOptions {
  /** Maximum number of entries in the cache (default: 100) */
  maxEntries?: number;
  /** Time-to-live for cache entries in milliseconds (default: 1800000 = 30 minutes) */
  ttlMs?: number;
}

/**
 * LRU cache with TTL expiry for AI analysis responses.
 * 
 * @example
 * ```ts
 * const cache = new AiCache({ maxEntries: 50, ttlMs: 600_000 }); // 10 min TTL
 * 
 * const key = cache.createKey(promptText);
 * const cached = cache.get(key);
 * if (cached) return cached;
 * 
 * const result = await callAI(prompt);
 * cache.set(key, result);
 * return result;
 * ```
 */
export class AiCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(options?: AiCacheOptions) {
    this.maxEntries = options?.maxEntries ?? 100;
    this.ttlMs = options?.ttlMs ?? 30 * 60 * 1000; // 30 minutes default
  }

  /**
   * Creates a deterministic cache key from prompt text.
   * Uses SHA-256 hash truncated to 16 hex chars for compactness.
   */
  createKey(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex').substring(0, 32);
  }

  /**
   * Retrieves a cached value if it exists and has not expired.
   * Moves the entry to the end of the Map (LRU refresh).
   * @returns The cached value, or `null` if not found / expired.
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check TTL expiry
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // LRU refresh: delete and re-insert to move to end of Map iteration order
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Stores a value in the cache with automatic TTL.
   * Evicts the oldest entry if the cache is at capacity.
   */
  set(key: string, value: T): void {
    // If key already exists, delete first (for LRU ordering)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Returns the current number of entries in the cache.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Removes all expired entries from the cache.
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }
}
