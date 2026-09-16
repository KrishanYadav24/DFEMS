import { Router } from 'express';
import { getCases, getCaseById, createCase, updateCaseStatus } from '../controllers/caseController.js';
import { validateBody, validateNumericId } from '../middleware/validate.js';

const router = Router();

router.get('/', getCases);
router.get('/:id', validateNumericId('id'), getCaseById);
router.post('/', validateBody(['title']), createCase);
router.put('/:id/status', validateNumericId('id'), validateBody(['status']), updateCaseStatus);

export default router;
