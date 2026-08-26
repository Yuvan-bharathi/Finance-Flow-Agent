/**
 * Service: Client-Side In-Memory SWR (Stale-While-Revalidate) Cache
 *
 * Purpose:
 * Prevents redundant HTTP and database calls when switching between tabs
 * (Payments, Companies, Loans, Reports, Audit Logs).
 * Provides instant rendering when cached data is available while quietly
 * refreshing data in the background if stale.
 */

class ClientSwrCache {
  constructor() {
    this.cache = new Map(); // key -> { data, timestamp, isFetching }
    this.subscribers = new Map(); // key -> Set of callbacks
  }

  /**
   * Fetches data with SWR caching strategy.
   *
   * @param {string} key - Unique cache key (e.g. "payments:2025-05-01:2025-05-31:1")
   * @param {Function} fetcher - Async function returning data
   * @param {Object} options - { ttlMs: 30000, onBackgroundUpdate: Function }
   * @returns {Promise<any>} Data payload
   */
  async fetchWithSwr(key, fetcher, options = {}) {
    const { ttlMs = 30000, onBackgroundUpdate } = options;
    const now = Date.now();
    const entry = this.cache.get(key);

    if (onBackgroundUpdate) {
      if (!this.subscribers.has(key)) this.subscribers.set(key, new Set());
      this.subscribers.get(key).add(onBackgroundUpdate);
    }

    // 1. Cache HIT & Fresh: Return immediately
    if (entry && (now - entry.timestamp) < ttlMs) {
      return entry.data;
    }

    // 2. Cache HIT & Stale: Return stale data immediately, revalidate in background
    if (entry && !entry.isFetching) {
      entry.isFetching = true;
      this.revalidateInBackground(key, fetcher);
      return entry.data;
    }

    // 3. Cache MISS: Await network fetch
    try {
      const freshData = await fetcher();
      this.cache.set(key, { data: freshData, timestamp: Date.now(), isFetching: false });
      return freshData;
    } catch (err) {
      if (entry) return entry.data; // Return stale fallback on network error
      throw err;
    }
  }

  /**
   * Background revalidation worker
   */
  async revalidateInBackground(key, fetcher) {
    try {
      const freshData = await fetcher();
      this.cache.set(key, { data: freshData, timestamp: Date.now(), isFetching: false });
      
      // Notify active page subscribers
      const listeners = this.subscribers.get(key);
      if (listeners) {
        listeners.forEach(cb => {
          try { cb(freshData); } catch (e) {}
        });
      }
    } catch (e) {
      const entry = this.cache.get(key);
      if (entry) entry.isFetching = false;
    }
  }

  /**
   * Invalidates cache keys matching a prefix or pattern.
   *
   * @param {string} prefix - Key prefix to invalidate (e.g. "payments")
   */
  invalidate(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Unsubscribe page callback
   */
  unsubscribe(key, callback) {
    const listeners = this.subscribers.get(key);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) this.subscribers.delete(key);
    }
  }

  clear() {
    this.cache.clear();
    this.subscribers.clear();
  }
}

export const swrCache = new ClientSwrCache();
export default swrCache;
