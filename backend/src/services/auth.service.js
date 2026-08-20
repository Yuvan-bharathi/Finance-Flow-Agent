import bcrypt from 'bcryptjs';
import { findUserByEmail, findUserById, updateLastLogin } from '../models/user.model.js';
import { generateToken } from '../utils/tokenHelper.js';

/**
 * Service: Authentication Service
 * Purpose: Encapsulates authentication business logic, password verification, and JWT generation.
 * 
 * Called by:
 * - auth.controller.js (POST /api/auth/login, GET /api/auth/me)
 */

/**
 * Service function: loginUser
 * 
 * Purpose:
 * Validates user credentials, checks account status, updates last login timestamp, and generates a JWT token.
 * 
 * Called by:
 * - auth.controller.js -> loginController
 * 
 * Receives:
 * - email {string}: User's login email.
 * - password {string}: User's plain text password.
 * 
 * Data flow:
 * Login Form ➔ POST /api/auth/login ➔ auth.controller.js ➔ auth.service.js ➔ findUserByEmail ➔ MySQL
 * 
 * Returns:
 * {Object} { user, token }
 * 
 * Possible errors:
 * - Invalid email/password (401)
 * - Inactive account (403)
 */
export const loginUser = async (email, password) => {
  // 1. Fetch user by email from database
  const user = await findUserByEmail(email);
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // 2. Check if account is active
  if (!user.is_active) {
    const error = new Error('Account is deactivated. Please contact your system administrator.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Verify password hash using bcrypt
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // 4. Update last login timestamp in database
  await updateLastLogin(user.id);

  // 5. Create token payload
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name
  };

  // 6. Sign JWT token
  const token = generateToken(payload);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name
    },
    token
  };
};

/**
 * Service function: getCurrentUser
 * 
 * Purpose:
 * Fetches current authenticated user profile by user ID.
 * 
 * Called by:
 * - auth.controller.js -> getMeController
 * 
 * @param {number} userId - Authenticated user ID.
 * @returns {Promise<Object>} User profile object.
 */
export const getCurrentUser = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }
  return user;
};
