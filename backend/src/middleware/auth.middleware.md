# Auth Middleware Documentation

## Purpose
Verifies user authentication by inspecting HTTP-only JWT cookies or Authorization Bearer headers.

## Data Flow
```
Client Request
     │
     ▼
auth.middleware.js (authenticate)
     │
     ├─► Check req.cookies.token / Authorization Header
     ├─► Verify token signature & expiry (tokenHelper.js)
     ├─► Attach decoded user payload to req.user
     └─► Call next()
```

## Mentor Questions

### Q1. What happens if an expired JWT token is passed?
**Answer**: `jwt.verify()` throws a `TokenExpiredError`. The middleware catches it and returns HTTP 401 with message `"Authentication failed. Token has expired."` prompting the client to re-login.
