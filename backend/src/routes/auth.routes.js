import { Router } from 'express';
import { login, logout, getMe, getUsers, getDemoUsers, createUser, setPassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate User & Issue JWT Session
 *     description: Validates email and password, returns user profile, PBAC role, and sets HTTP-only JWT auth cookie.
 *     tags:
 *       - Authentication & Access Control
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@financeflow.com
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Successfully authenticated.
 *       401:
 *         description: Invalid email or password.
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/login', authRateLimiter, login);

/**
 * @openapi
 * /api/v1/auth/demo-users:
 *   get:
 *     summary: List Available Demo Personas
 *     description: Returns pre-seeded system demo users (Admin, Risk Manager, Senior Accountant, Viewer) for quick evaluation.
 *     tags:
 *       - Authentication & Access Control
 *     responses:
 *       200:
 *         description: List of demo user accounts.
 */
router.get('/demo-users', getDemoUsers);

router.post('/set-password', setPassword);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get Current Authenticated User & Permissions
 *     description: Returns active session user profile, company affiliation, and PBAC capability list.
 *     tags:
 *       - Authentication & Access Control
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user context.
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/me', authenticate, getMe);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Invalidate Session & Clear Cookies
 *     description: Clears HTTP-only authentication cookies and revokes client session.
 *     tags:
 *       - Authentication & Access Control
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out.
 */
router.post('/logout', authenticate, logout);

// Hierarchical User Management Endpoints
router.get('/users', authenticate, getUsers);
router.post('/users/create', authenticate, createUser);

export default router;
