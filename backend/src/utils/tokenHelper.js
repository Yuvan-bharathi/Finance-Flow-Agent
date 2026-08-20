import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Module: Utility / JWT Token Helper
 * Purpose: Generates and verifies JSON Web Tokens (JWT) for user authentication.
 * 
 * Called by:
 * - auth.service.js (token generation during login)
 * - auth.middleware.js (token verification for protected routes)
 * 
 * Data flow:
 * Login request ➔ auth.service.js ➔ generateToken(payload) ➔ JWT String ➔ Set HTTP-only Cookie
 * Protected request ➔ Cookie ➔ auth.middleware.js ➔ verifyToken(token) ➔ Decoded Payload ➔ req.user
 */

/**
 * Generates a signed JWT token containing user ID, email, and role ID.
 * 
 * @param {Object} payload - Object containing { id, email, role_id, role_name }.
 * @returns {string} Signed JWT token string.
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Verifies a JWT token using the system JWT secret.
 * 
 * @param {string} token - Signed JWT string.
 * @returns {Object} Decoded payload object.
 * @throws {Error} Throws error if token is expired or invalid.
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Sets an HTTP-only cookie containing the JWT token on the response.
 * 
 * @param {Object} res - Express response object.
 * @param {string} token - JWT token string.
 */
export const setAuthCookie = (res, token) => {
  const isProduction = config.nodeEnv === 'production';
  
  res.cookie('token', token, {
    httpOnly: true, // Prevents XSS attacks by restricting JavaScript access
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
  });
};

/**
 * Clears the auth cookie on logout.
 * 
 * @param {Object} res - Express response object.
 */
export const clearAuthCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });
};
