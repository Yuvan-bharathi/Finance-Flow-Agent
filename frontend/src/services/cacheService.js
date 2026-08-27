/**
 * Module: Frontend Client Local Cache Layer (Phase 6 Performance Architecture)
 * 
 * Purpose:
 * Provides a high-speed, zero-latency in-memory + sessionStorage local cache for API reads.
 * Dramatically accelerates UI navigation across Companies, Loans, Portfolio KPIs, Reconciliations,
 * and Notifications while ensuring automated tag-based cache purging upon any write mutations or real-time WebSocket events.
 * 
 * Features:
 * 1. Fast In-Memory Map with LRU (Least Recently Used) Eviction
 * 2. SessionStorage Persistence (survives component unmounts and fast tab switches)
 * 3. Tag-Based Group Invalidation ('companies', 'loans', 'payments', 'reports', 'reconciliations', 'notifications')
 * 4. Automatic Mutation Purging (POST / PUT / DELETE API requests invalidate associated tags)
 * 5. Real-Time WebSocket Invalidation Hooks
 * 6. Cache Hit/Miss Diagnostic Metrics
 */

class ClientCacheService {
  constructor(maxSize = 250) {
    this.memoryStore = new Map();     // key -> { value, expiresAt, tags }
    this.tagIndex = new Map();        // tag -> Set of keys
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
    this.storagePrefix = 'ff_cache_';

    // Restore eligible items from sessionStorage on initial page load
    this.restoreFromStorage();
  }

  /**
   * Generates a deterministic cache key from URL path and sorted query params.
   * 
   * @param {string} url - Request URL
   * @param {Object} [params={}] - Query parameters
   * @returns {string} Normalized cache key
   */
  generateKey(url, params = {}) {
    const cleanUrl = (url || '').split('?')[0];
    const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    
    // Merge object params into url params
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null) {
          urlParams.set(k, String(params[k]));
        }
      });
    }

    urlParams.sort();
    const paramString = urlParams.toString();
    return paramString ? `${cleanUrl}?${paramString}` : cleanUrl;
  }

  /**
   * Retrieves a cached payload if available and unexpired.
   * 
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null
   */
  get(key) {
    const normalizedKey = key.startsWith(this.storagePrefix) ? key : `${this.storagePrefix}${key}`;
    const item = this.memoryStore.get(normalizedKey);

    if (!item) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > item.expiresAt) {
      this.delete(normalizedKey);
      this.misses++;
      return null;
    }

    this.hits++;
    // LRU refresh: re-insert at end of Map
    this.memoryStore.delete(normalizedKey);
    this.memoryStore.set(normalizedKey, item);
    return item.value;
  }

  /**
   * Stores a data payload in the local cache with TTL and domain tags.
   * 
   * @param {string} key - Cache key
   * @param {any} value - Serializable data payload
   * @param {number} [ttlSeconds=60] - Time to live in seconds
   * @param {Array<string>} [tags=[]] - Domain tags for group invalidation
   */
  set(key, value, ttlSeconds = 60, tags = []) {
    const normalizedKey = key.startsWith(this.storagePrefix) ? key : `${this.storagePrefix}${key}`;

    // LRU Eviction if capacity exceeded
    if (this.memoryStore.size >= this.maxSize && !this.memoryStore.has(normalizedKey)) {
      const oldestKey = this.memoryStore.keys().next().value;
      if (oldestKey) this.delete(oldestKey);
    }

    const expiresAt = Date.now() + (ttlSeconds * 1000);

    // Remove existing tag associations
    this.removeKeyFromTags(normalizedKey);

    const cacheEntry = { value, expiresAt, tags };
    this.memoryStore.set(normalizedKey, cacheEntry);

    // Map tags
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(normalizedKey);
    }

    // Persist to sessionStorage for quick tab switches
    try {
      sessionStorage.setItem(normalizedKey, JSON.stringify(cacheEntry));
    } catch (e) {
      // Ignore quota exceeded errors
    }
  }

  /**
   * Deletes a specific cache key.
   */
  delete(key) {
    const normalizedKey = key.startsWith(this.storagePrefix) ? key : `${this.storagePrefix}${key}`;
    this.removeKeyFromTags(normalizedKey);
    this.memoryStore.delete(normalizedKey);
    try {
      sessionStorage.removeItem(normalizedKey);
    } catch (e) {}
  }

  /**
   * Invalidates all cache entries associated with a specific domain tag.
   * 
   * @param {string} tag - Domain tag (e.g. 'companies', 'loans', 'payments', 'reports', 'notifications')
   * @returns {number} Number of purged entries
   */
  invalidateByTag(tag) {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) return 0;

    let count = 0;
    for (const key of Array.from(keys)) {
      this.delete(key);
      count++;
    }

    this.tagIndex.delete(tag);
    if (import.meta.env?.DEV) {
      console.log(`🧹 [Client Cache] Purged ${count} items for tag: '${tag}'`);
    }
    return count;
  }

  /**
   * Helper to derive relevant tags from an API URL path.
   * 
   * @param {string} url - Request URL
   * @returns {Array<string>} Associated tags
   */
  inferTagsFromUrl(url = '') {
    const clean = url.toLowerCase();
    const tags = [];

    if (clean.includes('/companies')) tags.push('companies', 'reports');
    if (clean.includes('/loans') || clean.includes('/repayments')) tags.push('loans', 'companies', 'reports');
    if (clean.includes('/payments')) tags.push('payments', 'loans', 'reconciliations', 'reports');
    if (clean.includes('/reconciliation') || clean.includes('/cases')) tags.push('reconciliations', 'payments', 'reports');
    if (clean.includes('/notifications') || clean.includes('/alerts') || clean.includes('/escalate')) tags.push('notifications');
    if (clean.includes('/portfolio') || clean.includes('/reports')) tags.push('reports');

    return tags.length > 0 ? tags : ['general'];
  }

  /**
   * Removes key from tag index sets.
   */
  removeKeyFromTags(key) {
    const item = this.memoryStore.get(key);
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
   * Restores unexpired cached entries from sessionStorage on load.
   */
  restoreFromStorage() {
    try {
      const now = Date.now();
      for (let i = 0; i < sessionStorage.length; i++) {
        const storageKey = sessionStorage.key(i);
        if (storageKey && storageKey.startsWith(this.storagePrefix)) {
          const raw = sessionStorage.getItem(storageKey);
          if (raw) {
            const entry = JSON.parse(raw);
            if (entry.expiresAt && entry.expiresAt > now) {
              this.memoryStore.set(storageKey, entry);
              if (Array.isArray(entry.tags)) {
                for (const tag of entry.tags) {
                  if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
                  this.tagIndex.get(tag).add(storageKey);
                }
              }
            } else {
              sessionStorage.removeItem(storageKey);
            }
          }
        }
      }
    } catch (e) {
      // sessionStorage unavailable or disabled
    }
  }

  /**
   * Stale-While-Revalidate (SWR) fetching helper.
   * Immediately returns cached data if present, while asynchronously fetching
   * fresh data in the background and notifying `onBackgroundUpdate`.
   * 
   * @param {string} key - Cache identifier
   * @param {Function} fetcher - Async fetch callback
   * @param {Object} [options] - Configuration
   * @param {number} [options.ttlMs=60000] - TTL in milliseconds
   * @param {Function} [options.onBackgroundUpdate] - Background fresh data callback
   * @param {Array<string>} [options.tags=[]] - Group tags
   * @returns {Promise<any>} Cached or fresh data payload
   */
  async fetchWithSwr(key, fetcher, options = {}) {
    const { ttlMs = 60000, onBackgroundUpdate, tags = [] } = options;
    const ttlSeconds = Math.max(1, Math.round(ttlMs / 1000));
    const cached = this.get(key);

    if (cached !== null && cached !== undefined) {
      // Asynchronously revalidate in background
      Promise.resolve().then(async () => {
        try {
          const fresh = await fetcher();
          if (fresh !== undefined) {
            this.set(key, fresh, ttlSeconds, tags);
            if (typeof onBackgroundUpdate === 'function') {
              onBackgroundUpdate(fresh);
            }
          }
        } catch (e) {
          // Swallow background revalidation errors
        }
      });
      return cached;
    }

    // Cache Miss: Fetch synchronously
    const fresh = await fetcher();
    if (fresh !== undefined) {
      this.set(key, fresh, ttlSeconds, tags);
    }
    return fresh;
  }

  /**
   * Alias for invalidateByTag or single key deletion.
   */
  invalidate(tagOrKey) {
    if (this.tagIndex.has(tagOrKey)) {
      return this.invalidateByTag(tagOrKey);
    }
    return this.delete(tagOrKey);
  }

  /**
   * Flushes all cached data in memory and sessionStorage.
   */
  clear() {
    this.memoryStore.clear();
    this.tagIndex.clear();
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.storagePrefix)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (e) {}
    console.log('🧹 [Client Cache] Flushed all local cache data.');
  }

  /**
   * Returns diagnostic statistics.
   */
  getStats() {
    const total = this.hits + this.misses;
    const ratio = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0.0%';
    return {
      size: this.memoryStore.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio: ratio,
      activeTags: Array.from(this.tagIndex.keys())
    };
  }
}

export const clientCache = new ClientCacheService();
export const swrCache = clientCache; // SWR alias for backward-compatibility
export default clientCache;
