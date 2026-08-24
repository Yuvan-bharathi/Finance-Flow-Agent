import { Router } from 'express';
import { login, logout, getMe, getUsers, getDemoUsers, createUser, setPassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/login', login);
router.post('/set-password', setPassword);
router.get('/demo-users', getDemoUsers);

// Authenticated Session Endpoints
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// Hierarchical User Management Endpoints
router.get('/users', authenticate, getUsers);
router.post('/users/create', authenticate, createUser);

export default router;
