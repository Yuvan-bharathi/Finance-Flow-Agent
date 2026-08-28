# Module: Swagger & OpenAPI 3.0 Interactive Documentation (`swagger.config.js`)

## Purpose
Configures the automated OpenAPI 3.0.3 specification generator and interactive Swagger UI interface mounted at `/api-docs` and `/api-docs.json`.

---

## Architecture & Data Flow

```
   Source Code JSDoc Annotations
    (backend/src/routes/*.js)
                 │
                 ▼
          swagger-jsdoc
                 │
                 ▼
       OpenAPI 3.0.3 JSON Spec (/api-docs.json)
                 │
                 ▼
       swagger-ui-express
                 │
                 ▼
     Interactive Swagger UI (/api-docs)
  (Try It Out, Bearer Auth, Idempotency)
```

---

## Security Schemes Supported

1. **`BearerAuth`**:
   - Standard HTTP Bearer scheme passing JSON Web Tokens in `Authorization: Bearer <jwt>`.
2. **`CorrelationIdHeader`**:
   - `X-Correlation-ID` (`FF-YYYYMMDD-<uuid8>`) for end-to-end request tracing.
3. **`IdempotencyKeyHeader`**:
   - `Idempotency-Key` (<UUIDv4>) to guarantee zero duplicate financial mutations.

---

## Mentor & Technical Assessment Interview Questions

### 1. What is the difference between OpenAPI and Swagger?
* **OpenAPI** is the formal, vendor-neutral specification standard (REST API schema format written in JSON/YAML).
* **Swagger** refers to the suite of open-source tools (e.g. Swagger UI, Swagger Editor, Swagger Codegen) used to render, generate, and interact with OpenAPI specifications.

### 2. Why use `swagger-jsdoc` over a static `swagger.json` file?
`swagger-jsdoc` extracts OpenAPI schema definitions directly from JSDoc comments placed alongside route handlers. This ensures documentation is kept closely in sync with actual controller code changes rather than rotting in a disconnected static JSON file.
