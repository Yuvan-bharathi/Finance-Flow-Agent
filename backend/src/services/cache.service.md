# Service Documentation: `cache.service.js`

---

## 1. Overview & Architectural Role
- **Module**: `backend/src/services/cache.service.js`
- **Purpose**: Provides a zero-dependency in-memory cache abstraction with TTL expiration and tag-based group invalidation (`invalidateByTag`).
- **Phase 8 Scaling Path**: Abstract interface designed for drop-in replacement by a Redis distributed cluster adapter in Phase 8 without modifying route controllers.

---

## 2. Key Methods

### `get(key)`
- Returns cached deserialized object if present and TTL has not expired; otherwise returns `null`.

### `set(key, value, ttlSeconds = 60, tags = [])`
- Caches the payload and indexes the key under the specified tags (e.g. `['payments', 'reports']`).

### `invalidateByTag(tag)`
- Purges all cached query keys mapped to a specific business domain tag upon write mutations.

---

## 3. Interview Preparation Q&A

**Q: How do you prevent stale cache reads when a payment is ingested?**
> We use tag-based cache invalidation. Read queries are cached under semantic tags (e.g. `payments`, `reports`). When a mutation occurs (such as ingesting a payment or settling an AI recommendation), the service calls `cacheService.invalidateByTag('payments')` and `invalidateByTag('reports')`. Subsequent read queries automatically bypass the cache, query fresh data from MySQL, and repopulate the cache.
