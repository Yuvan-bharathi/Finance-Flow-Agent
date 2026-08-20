# Auth Service Documentation

## Purpose
Encapsulates business logic for user login, bcrypt password hash validation, account active status checks, and token generation.

## Functions

### `loginUser(email, password)`
- **Called by**: `auth.controller.js` -> `login()`
- **Receives**: Plain text email and password.
- **Calls**: `user.model.js` (`findUserByEmail`), `bcrypt.compare()`, `user.model.js` (`updateLastLogin`), `tokenHelper.js` (`generateToken`).
- **Returns**: `{ user, token }`
- **Errors**: 401 Invalid Credentials, 403 Account Inactive.

### `getCurrentUser(userId)`
- **Called by**: `auth.controller.js` -> `getMe()`
- **Receives**: `userId` (number).
- **Calls**: `user.model.js` (`findUserById`).
- **Returns**: User profile object without password hash.

## Mentor Questions

### Q1. Why separate controller logic from service logic?
**Answer**: Controller code handles HTTP protocol mechanics (request parsing, response formatting, status codes, cookies). Service code handles pure business logic and rules. This Separation of Concerns (SoC) makes unit testing much easier and prevents monolithic controller files.
