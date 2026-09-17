import { Router } from 'express';
import { getAnalyses, addAnalysis } from '../controllers/analysisController.js';
import { validateBody } from '../middleware/validate.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

// Protect all forensic analysis routes
router.use(authenticateToken);

router.get('/', getAnalyses);

// Log examination findings: Admin, Forensic Examiner, Lab Technician
router.post(
  '/',
  requireRoles('Admin', 'Forensic Examiner', 'Lab Technician'),
  validateBody(['evidenceId', 'analystId', 'findings']),
  addAnalysis
);

export default router;
