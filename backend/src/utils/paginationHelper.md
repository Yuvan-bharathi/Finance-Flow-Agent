# Pagination Helper (`paginationHelper.js`)

## Purpose
The `paginationHelper.js` utility provides standardized, SQL-injection-safe pagination parsing and response wrapping. It prevents large queries from exhausting server memory by capping the maximum page size (`limit <= 100`) and validates `sortBy` arguments against strict column whitelists.

---

## Data Flow

```
GET /api/v1/payments?page=2&limit=10&sortBy=amount&order=desc
   │
   ▼
payment.controller.js
   │
   ├── parsePagination(req.query, allowedColumns, 'created_at')
   │      └── Returns { page: 2, limit: 10, offset: 10, sortBy: 'amount', order: 'DESC' }
   │
   ├── payment.model.js
   │      ├── SELECT COUNT(*) FROM payments WHERE ...
   │      └── SELECT * FROM payments WHERE ... ORDER BY amount DESC LIMIT 10 OFFSET 10
   │
   ▼
buildPaginatedResponse(rows, totalCount, { page: 2, limit: 10 })
   │
   ▼
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 2,
    "limit": 10,
    "totalRecords": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Functions

### `parsePagination(query, allowedSortColumns, defaultSort)`
- **Purpose**: Parses `req.query`, calculates `offset`, and guarantees that `limit` never exceeds 100 and `order` is strictly `ASC` or `DESC`.

### `buildPaginatedResponse(data, totalRecords, { page, limit })`
- **Purpose**: Assembles the standard pagination envelope with `totalPages`, `hasNext`, and `hasPrev` flags.

---

## Mentor Questions

### Q1. Why is the maximum `limit` capped at 100?
Without an upper bound, a client or malicious user could request `GET /api/payments?limit=1000000`, causing NodeJS to allocate massive memory buffers and causing MySQL to lock tables or crash under high load.

### Q2. How does `parsePagination` prevent SQL injection in `ORDER BY` clauses?
Prepared statements with placeholders (`?`) cannot parameterize SQL identifiers like column names or `ASC`/`DESC` keywords in `ORDER BY`. By strictly comparing `sortBy` against an allowed array (`allowedSortColumns.includes(...)`), malicious SQL fragments (e.g. `?sortBy=id;DROP TABLE users;--`) are rejected and replaced with the safe default column.
