import type { CacheEntry, CacheStats } from '../types/common';

/**
 * Module: Frontend Client Local Cache Layer (Phase 6 Performance Architecture)
 *
 * Provides a high-speed, zero-latency in-memory + sessionStorage local cache for API reads.
 * Dramatically accelerates UI navigation across Companies, Loans, Portfolio KPIs, Reconciliations,
 * and Notifications while ensuring automated tag-based cache purging upon any write mutations or real-time WebSocket events.
 */

type Fetcher<T> = () => Promise<T>;

interface SWROptions<T> {
  ttlMs?: number;
  onBackgroundUpdate?: (data: T) => void;
  tags?: string[];
}

class ClientCacheService {
  private memoryStore: Map<string, CacheEntry>;
  private tagIndex: Map<string, Set<string>>;
  private maxSize: number;
  private hits: number;
  private misses: number;
  private readonly storagePrefix: string;

  constructor(maxSize = 250) {
    this.memoryStore = new Map();
    this.tagIndex = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
    this.storagePrefix = 'ff_cache_';
    this.restoreFromStorage();
  }

  generateKey(url: string, params: Record<string, unknown> = {}): string {
    const cleanUrl = (url || '').split('?')[0];
    const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');

    if (params && typeof params === 'object') {
      Object.keys(params).forEach(k => {
        const v = params[k];
        if (v !== undefined && v !== null) {
          urlParams.set(k, String(v));
        }
      });
    }

    urlParams.sort();
    const paramString = urlParams.toString();
    return paramString ? `${cleanUrl}?${paramString}` : cleanUrl;
  }

  get(key: string): unknown | null {
    const normalizedKey = key.startsWith(this.storagePrefix) ? key : `${this.storagePrefix}${key}`;
    const item = this.memoryStore.get(normalizedKey);

    if (!item) {
      this.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.delete(normalizedKey);
      this.misses++;
      return null;
    }

    this.hits++;
    this.memoryStore.delete(normalizedKey);
    this.memoryStore.set(normalizedKey, item);
    return item.value;
  }

  set(key: string, value: unknown, ttlSeconds = 60, tags: string[] = []): void {
    const normalizedKey = key.startsWith(this.storagePrefix) ? key : `${this.storagePrefix}${key}`;

    if (this.memoryStore.size >= this.maxSize && !this.memoryStore.has(normalizedKey)) {
      const oldestKey = this.memoryStore.keys().next().value;
      if (oldestKey) this.delete(oldestKey);
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.removeKeyFromTags(normalizedKey);

    const cacheEntry: CacheEntry = { value, expiresAt, tags };
    this.memoryStore.set(normalizedKey, cacheEntry);

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(normalizedKey);
    }

    try {
      sessionStorage.setItem(normalizedKey, JSON.stringify(cacheEntry));
    } catch {
      // Ignore quota exceeded
    }
  }

  delete(key: string): void {
    const normalizedKey = key.startsWith(this.storagePrefix) ? key : `${this.storagePrefix}${key}`;
    this.removeKeyFromTags(normalizedKey);
    this.memoryStore.delete(normalizedKey);
    try {
      sessionStorage.removeItem(normalizedKey);
    } catch { /* empty */ }
  }

  invalidateByTag(tag: string): number {
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

  inferTagsFromUrl(url = ''): string[] {
    const clean = url.toLowerCase();
    const tags: string[] = [];

    if (clean.includes('/companies')) tags.push('companies', 'reports');
    if (clean.includes('/loans') || clean.includes('/repayments')) tags.push('loans', 'companies', 'reports');
    if (clean.includes('/payments')) tags.push('payments', 'loans', 'reconciliations', 'reports');
    if (clean.includes('/reconciliation') || clean.includes('/cases')) tags.push('reconciliations', 'payments', 'reports');
    if (clean.includes('/notifications') || clean.includes('/alerts') || clean.includes('/escalate')) tags.push('notifications');
    if (clean.includes('/portfolio') || clean.includes('/reports')) tags.push('reports');
    if (clean.includes('/anomalies') || clean.includes('/anomaly')) tags.push('anomalies');
    if (clean.includes('/agents') || clean.includes('/pipeline')) tags.push('agents');

    return tags.length > 0 ? tags : ['general'];
  }

  getTtlForUrl(url = ''): number {
    const clean = url.toLowerCase();
    if (clean.includes('/queue/status') || clean.includes('/queue')) return 5;
    if (clean.includes('/anomalies') || clean.includes('/anomaly')) return 20;
    if (clean.includes('/agents/status') || clean.includes('/agents')) return 45;
    if (clean.includes('/payments')) return 45;
    if (clean.includes('/reconciliation') || clean.includes('/cases')) return 45;
    if (clean.includes('/portfolio')) return 120;
    if (clean.includes('/pipeline/executions')) return 180;
    if (clean.includes('/audit') || clean.includes('/reports')) return 300;
    return 60;
  }

  private removeKeyFromTags(key: string): void {
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

  private restoreFromStorage(): void {
    try {
      const now = Date.now();
      for (let i = 0; i < sessionStorage.length; i++) {
        const storageKey = sessionStorage.key(i);
        if (storageKey && storageKey.startsWith(this.storagePrefix)) {
          const raw = sessionStorage.getItem(storageKey);
          if (raw) {
            const entry = JSON.parse(raw) as CacheEntry;
            if (entry.expiresAt && entry.expiresAt > now) {
              this.memoryStore.set(storageKey, entry);
              if (Array.isArray(entry.tags)) {
                for (const tag of entry.tags) {
                  if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
                  this.tagIndex.get(tag)!.add(storageKey);
                }
              }
            } else {
              sessionStorage.removeItem(storageKey);
            }
          }
        }
      }
    } catch {
      // sessionStorage unavailable
    }
  }

  async fetchWithSwr<T>(key: string, fetcher: Fetcher<T>, options: SWROptions<T> = {}): Promise<T> {
    const { ttlMs = 60000, onBackgroundUpdate, tags = [] } = options;
    const ttlSeconds = Math.max(1, Math.round(ttlMs / 1000));
    const cached = this.get(key);

    if (cached !== null && cached !== undefined) {
      Promise.resolve().then(async () => {
        try {
          const fresh = await fetcher();
          if (fresh !== undefined) {
            this.set(key, fresh, ttlSeconds, tags);
            if (typeof onBackgroundUpdate === 'function') {
              onBackgroundUpdate(fresh);
            }
          }
        } catch { /* Swallow background errors */ }
      });
      return cached as T;
    }

    const fresh = await fetcher();
    if (fresh !== undefined) {
      this.set(key, fresh, ttlSeconds, tags);
    }
    return fresh;
  }

  invalidate(tagOrKey: string): number | void {
    if (this.tagIndex.has(tagOrKey)) {
      return this.invalidateByTag(tagOrKey);
    }
    return this.delete(tagOrKey);
  }

  clear(): void {
    this.memoryStore.clear();
    this.tagIndex.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.storagePrefix)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch { /* empty */ }
    console.log('🧹 [Client Cache] Flushed all local cache data.');
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const ratio = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0.0%';
    return {
      size: this.memoryStore.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio: ratio,
      activeTags: Array.from(this.tagIndex.keys()),
    };
  }
}

export const clientCache = new ClientCacheService();
export const swrCache = clientCache;
export default clientCache;
