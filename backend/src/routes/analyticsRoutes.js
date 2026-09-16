import { Router } from 'express';
import { runQuery, getView, getDashboardStats } from '../controllers/analyticsController.js';

const router = Router();

router.get('/query/:type/:key', runQuery);
router.get('/view/:viewName', getView);
router.get('/dashboard-stats', getDashboardStats);

export default router;
