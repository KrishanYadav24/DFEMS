import { Router } from 'express';
import { getAnalyses, addAnalysis } from '../controllers/analysisController.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', getAnalyses);
router.post('/', validateBody(['evidenceId', 'analystId', 'findings']), addAnalysis);

export default router;
