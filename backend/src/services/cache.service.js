import logger from '../utils/logger.js';

/**
 * Module: Multi-Tier Cache Abstraction (Zero-Dependency In-Memory Adapter)
 *
 * Purpose:
 * Provides high-performance in-memory caching with TTL expiration,
 * key hashing, and tag-based group invalidation (`invalidateByTag`).
 *
 * Architectural Design:
 * Abstract interface with an in-memory Map implementation for current zero-dependency deployment,
 * designed for seamless evolution to a Redis cluster in Phase 8 Production.
 *
 * Data Flow:
 * Incoming Request ➔ cache.middleware.js ➔ cache.service.js:get(key)
 *   ├── Cache Hit: Returns cached payload (X-Cache: HIT)
 *   └── Cache Miss: Controller queries MySQL ➔ cache.service.js:set(key, val, ttl, tags)
 * Mutation (Payment / Settlement) ➔ cache.service.js:invalidateByTag('payments')
 */

class MemoryCacheAdapter {
  constructor(maxSize = 1000) {
    this.store = new Map();        // key -> { value, expiresAt, tags }
    this.tagIndex = new Map();     // tag -> Set of keys
    this.maxSize = maxSize;        // Maximum number of cached items
    this.hits = 0;
    this.misses = 0;
    
    // Periodic background cleanup for expired keys every 60 seconds
    this.cleanupInterval = setInterval(() => this.purgeExpired(), 60000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref(); // Do not block Node process exit
    }
  }

  /**
   * Retrieves a cached value if present and not expired.
   *
   * @param {string} key - Cache identifier
   * @returns {any|null} Cached object or null
   */
  get(key) {
    const item = this.store.get(key);
    if (!item) {
      this.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    // Move key to end to maintain LRU order in Map
    this.store.delete(key);
    this.store.set(key, item);
    return item.value;
  }

  /**
   * Stores a value in cache with TTL and optional tag associations.
   *
   * @param {string} key - Cache identifier
   * @param {any} value - Serializable data payload
   * @param {number} [ttlSeconds=60] - Time to live in seconds
   * @param {Array<string>} [tags=[]] - Tags for group invalidation (e.g. ['payments', 'reports'])
   */
  set(key, value, ttlSeconds = 60, tags = []) {
    // Evict oldest item if capacity is reached
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.delete(oldestKey);
    }

    const expiresAt = Date.now() + (ttlSeconds * 1000);
    
    // Clean old tag associations if key exists
    this.removeKeyFromTags(key);

    this.store.set(key, { value, expiresAt, tags });

    // Index key under each tag
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(key);
    }
  }

  /**
   * Deletes a specific key from cache.
   */
  delete(key) {
    this.removeKeyFromTags(key);
    return this.store.delete(key);
  }

  /**
   * Invalidates all cache entries associated with a specific tag.
   *
   * @param {string} tag - Tag name (e.g. 'payments', 'reconciliations', 'reports')
   * @returns {number} Count of invalidated cache keys
   */
  invalidateByTag(tag) {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) return 0;

    let count = 0;
    for (const key of keys) {
      this.store.delete(key);
      count++;
    }

    this.tagIndex.delete(tag);
    logger.info(`[Cache] Invalidated ${count} keys associated with tag '${tag}'`);
    return count;
  }

  /**
   * Purges all expired keys across the cache store.
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.delete(key);
      }
    }
  }

  /**
   * Removes a key from the tag index.
   */
  removeKeyFromTags(key) {
    const item = this.store.get(key);
    if (item && Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        const keySet = this.tagIndex.get(tag);
        if (keySet) {
          keySet.delete(key);
          if (keySet.size === 0) this.tagIndex.delete(tag);
        }
      }
    }
  }

  /**
   * Flushes the entire cache.
   */
  flushAll() {
    this.store.clear();
    this.tagIndex.clear();
    logger.info('[Cache] Flushed entire in-memory cache');
  }

  /**
   * Returns cache stats (size, hits, misses, hit ratio, active tags).
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? ((this.hits / totalRequests) * 100).toFixed(1) + '%' : '0.0%';
    return {
      totalKeys: this.store.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio,
      totalTags: this.tagIndex.size,
      tags: Array.from(this.tagIndex.keys())
    };
  }
}

// Global Singleton Cache Service
export const cacheService = new MemoryCacheAdapter();
export default cacheService;
