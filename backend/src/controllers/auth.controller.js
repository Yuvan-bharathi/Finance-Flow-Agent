import { loginUser, getCurrentUser } from '../services/auth.service.js';
import { setAuthCookie, clearAuthCookie } from '../utils/tokenHelper.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Authentication Controller
 * Purpose: Handles HTTP requests for user authentication (Login, Logout, Get Current User).
 * 
 * Called by:
 * - auth.routes.js
 */

/**
 * Controller: login
 * 
 * Purpose:
 * Authenticates user credentials and sets HTTP-only JWT cookie.
 * 
 * Endpoint: POST /api/auth/login
 * Access: Public
 * 
 * Data flow:
 * React Login Form ➔ POST /api/auth/login ➔ Express Route ➔ auth.controller.js ➔ auth.service.js ➔ MySQL ➔ Set Cookie ➔ Return JSON
 * 
 * @param {Object} req - Express request object. `req.body` contains `{ email, password }`.
 * @param {Object} res - Express response object used to set HTTP-only cookie and send JSON payload.
 * @param {Function} next - Error propagation callback.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    // Call service to process login business logic
    const { user, token } = await loginUser(email, password);

    // Set HTTP-only cookie for secure browser token storage
    setAuthCookie(res, token);

    return sendSuccessResponse(res, 200, 'Login successful', {
      user,
      token // Also returned in JSON for API clients / Postman testing
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: logout
 * 
 * Purpose:
 * Clears the HTTP-only JWT cookie to end the user's session.
 * 
 * Endpoint: POST /api/auth/logout
 * Access: Authenticated
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object used to clear auth cookie.
 * @param {Function} next - Error callback.
 */
export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    return sendSuccessResponse(res, 200, 'Logout successful', null);
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller: getMe
 * 
 * Purpose:
 * Returns the currently authenticated user's profile details.
 * 
 * Endpoint: GET /api/auth/me
 * Access: Authenticated (Requires authenticate middleware)
 * 
 * @param {Object} req - Express request object containing `req.user` attached by auth middleware.
 * @param {Object} res - Express response object.
 * @param {Function} next - Error callback.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.id);
    return sendSuccessResponse(res, 200, 'User profile retrieved successfully', { user });
  } catch (error) {
    return next(error);
  }
};
