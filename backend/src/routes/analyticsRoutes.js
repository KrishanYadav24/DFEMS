import { Router } from 'express';
import { runQuery, getView, getDashboardStats } from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Protect all analytics endpoints with authentication
router.use(authenticateToken);

router.get('/query/:type/:key', runQuery);
router.get('/view/:viewName', getView);
router.get('/dashboard-stats', getDashboardStats);

export default router;
