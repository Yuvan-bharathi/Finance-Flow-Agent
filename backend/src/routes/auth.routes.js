import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Express Router: Auth Routes
 * Base Path: /api/auth
 * 
 * Endpoints:
 * - POST /api/auth/login  (Public)
 * - POST /api/auth/logout (Authenticated)
 * - GET  /api/auth/me     (Authenticated)
 */

const router = Router();

// POST /api/auth/login — User login
router.post('/login', login);

// POST /api/auth/logout — User logout
router.post('/logout', authenticate, logout);

// GET /api/auth/me — Get authenticated user profile
router.get('/me', authenticate, getMe);

export default router;
