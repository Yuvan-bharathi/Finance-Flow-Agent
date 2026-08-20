# Auth Controller Documentation

## Purpose
Handles HTTP requests for user authentication (Login, Logout, Get Current User Profile) and manages HTTP-only JWT cookies.

## Endpoints
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Data Flow
```
React Login Form / Postman
         │
         ▼
 POST /api/auth/login
         │
         ▼
 auth.routes.js
         │
         ▼
 auth.controller.js (login)
         │
         ▼
 auth.service.js (loginUser)
         │
         ▼
 MySQL (findUserByEmail)
         │
         ▼
 bcrypt.compare()
         │
         ▼
 tokenHelper.js (setAuthCookie)
         │
         ▼
 HTTP Response + Cookie
```

## Functions

### `login(req, res, next)`
- **Receives**: `req.body.email`, `req.body.password`.
- **Calls**: `authService.loginUser()`, `tokenHelper.setAuthCookie()`.
- **Returns**: HTTP 200 with JSON payload `{ success: true, user, token }`.

### `logout(req, res, next)`
- **Calls**: `tokenHelper.clearAuthCookie()`.
- **Returns**: HTTP 200 with JSON payload `{ success: true }`.

### `getMe(req, res, next)`
- **Receives**: `req.user.id` (from `authenticate` middleware).
- **Calls**: `authService.getCurrentUser()`.
- **Returns**: HTTP 200 with user profile JSON.

## Mentor Questions

### Q1. Why use HTTP-only cookies for storing JWT tokens instead of localStorage?
**Answer**: LocalStorage is accessible by any client-side JavaScript, making it vulnerable to Cross-Site Scripting (XSS) attacks. HTTP-only cookies cannot be read by JavaScript scripts, providing a much higher security barrier.

### Q2. How does `req.user` get populated on protected endpoints?
**Answer**: The `authenticate` middleware parses the HTTP-only `token` cookie or Bearer header, verifies the signature using JWT secret, decodes the user payload, and assigns it to `req.user`.
