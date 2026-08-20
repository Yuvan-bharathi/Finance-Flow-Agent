import { verifyToken } from '../utils/tokenHelper.js';
import { sendErrorResponse } from '../utils/apiResponse.js';

/**
 * Authentication Middleware
 * 
 * Purpose:
 * Intercepts incoming HTTP requests to verify the user's JWT token (passed via HTTP-only cookie or Authorization header).
 * If valid, attaches the decoded user object to `req.user` and calls `next()`.
 * 
 * Called by:
 * - Express router prior to protected controllers.
 * 
 * Data flow:
 * Browser / Client HTTP Request
 *   ↓
 * Express Route (e.g. GET /api/payments)
 *   ↓
 * authMiddleware (Extract Cookie / Header ➔ verifyToken)
 *   ↓
 * Attach decoded user to req.user
 *   ↓
 * next() ➔ Controller Handler
 * 
 * @param {Object} req
 * Express request object.
 * Data sources:
 * - req.cookies.token (HTTP-only cookie containing JWT)
 * - req.headers.authorization (Bearer <token> format)
 * - req.user (Property set by this middleware containing { id, email, role_id, role_name })
 * 
 * @param {Object} res
 * Express response object used to return 401 Unauthorized errors if token is missing or invalid.
 * 
 * @param {Function} next
 * Express callback function that passes execution control to the next middleware or controller handler in the chain.
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } 
    // 2. Check Authorization header (Bearer token)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendErrorResponse(res, 401, 'Authentication required. No token provided.');
    }

    // Verify token payload
    const decodedPayload = verifyToken(token);
    
    // Attach decoded user info to req.user for subsequent controllers/middlewares
    req.user = decodedPayload;

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendErrorResponse(res, 401, 'Authentication failed. Token has expired.');
    }
    return sendErrorResponse(res, 401, 'Authentication failed. Invalid or corrupted token.');
  }
};
