import { Router } from 'express';
import { getUsers, login, createUser, getCurrentUser, logout } from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public authentication endpoint with rate limiting
router.post('/login', authLimiter, validateBody(['username', 'password']), login);

// Authenticated session endpoints
router.get('/me', authenticateToken, getCurrentUser);
router.post('/logout', authenticateToken, logout);

// Administrative User Management (Protected: Admin only)
router.get('/users', authenticateToken, requireRoles('Admin'), getUsers);
router.post('/users', authenticateToken, requireRoles('Admin'), validateBody(['firstName', 'lastName', 'username', 'role']), createUser);

export default router;
