import { Router } from 'express';
import { getAuditLogs, logEvent } from '../controllers/auditController.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', getAuditLogs);
router.post('/', validateBody(['action']), logEvent);

export default router;
