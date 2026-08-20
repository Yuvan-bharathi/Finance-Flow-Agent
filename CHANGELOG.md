# Changelog — FinanceFlow AI

## [1.0.0-Phase1] - 2026-08-18

### Added
- **Frozen 12-Table Database Architecture**:
  - `schema.sql` (MySQL DDL script with foreign key constraints, data types `DECIMAL(15,2)`, and B-Tree indexes).
  - `seed.sql` (Initial data for roles, admin/manager/accountant/viewer users, companies, active loans, repayment schedules, raw payments).
  - Comprehensive documentation files for all 12 tables under `database/documentation/` with Mentor Questions sections.
- **Node.js + Express Backend Foundation**:
  - MySQL connection pool wrapper (`db.js`) using `mysql2/promise`.
  - Environment configuration (`env.js`).
  - Standardized API response helpers (`apiResponse.js`) and JWT token helpers (`tokenHelper.js`).
  - Authentication middleware (`auth.middleware.js`) and RBAC authorization middleware (`rbac.middleware.js`).
  - Centralized Express error handler (`error.middleware.js`).
  - User model & repository (`user.model.js`).
  - Authentication service (`auth.service.js`) and controller (`auth.controller.js`).
  - Authentication routes (`auth.routes.js`) for `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
  - Express `app.js` and `server.js` entry points.
- **Root Documentation**:
  - `README.md`, `CHANGELOG.md`, `ARCHITECTURE_DECISIONS.md`, `AI_DEVELOPMENT_GUIDELINES.md`.
