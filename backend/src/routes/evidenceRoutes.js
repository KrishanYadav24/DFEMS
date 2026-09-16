import { Router } from 'express';
import { getEvidence, getEvidenceById, registerEvidence, verifyHash } from '../controllers/evidenceController.js';
import { validateBody, validateNumericId } from '../middleware/validate.js';

const router = Router();

router.get('/', getEvidence);
router.get('/:id', validateNumericId('id'), getEvidenceById);
router.post('/', validateBody(['description', 'caseId', 'hashValue']), registerEvidence);
router.post('/:id/verify-hash', validateNumericId('id'), validateBody(['providedHash']), verifyHash);

export default router;
