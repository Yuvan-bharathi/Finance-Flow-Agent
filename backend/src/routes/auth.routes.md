# Auth Routes Documentation

## Purpose
Defines Express route definitions for authentication endpoints under `/api/auth`.

## Route Table

| Method | Endpoint | Authentication | Required Role | Description |
|---|---|---|---|---|
| POST | `/api/auth/login` | Public | None | User login & cookie setting |
| POST | `/api/auth/logout` | Required | Any | Clear cookie & session end |
| GET | `/api/auth/me` | Required | Any | Get authenticated user profile |

## Mentor Questions

### Q1. How are routes protected against unauthorized access?
**Answer**: By chaining the `authenticate` middleware prior to controller handlers. If no valid JWT token is present in the cookie or header, execution stops in the middleware and returns HTTP 401 Unauthorized.
