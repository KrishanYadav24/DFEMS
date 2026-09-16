import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import caseRoutes from './caseRoutes.js';
import evidenceRoutes from './evidenceRoutes.js';
import custodyRoutes from './custodyRoutes.js';
import analysisRoutes from './analysisRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import auditRoutes from './auditRoutes.js';
import authRoutes from './authRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/cases', caseRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/custody', custodyRoutes);
router.use('/analysis', analysisRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/auth', authRoutes);

export default router;
