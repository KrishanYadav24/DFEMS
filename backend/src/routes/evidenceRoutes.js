import { Router } from 'express';
import { 
  getEvidence, 
  getEvidenceById, 
  registerEvidence, 
  updateEvidence, 
  verifyHash 
} from '../controllers/evidenceController.js';
import { validateBody, validateNumericId } from '../middleware/validate.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

// Protect all evidence endpoints with authentication
router.use(authenticateToken);

router.get('/', getEvidence);
router.get('/:id', validateNumericId('id'), getEvidenceById);

// Register evidence: Admin and Investigator
router.post(
  '/',
  requireRoles('Admin', 'Investigator'),
  validateBody(['description', 'caseId', 'hashValue']),
  registerEvidence
);

// Update permitted evidence metadata (description, status): Admin and Investigator
router.put(
  '/:id',
  requireRoles('Admin', 'Investigator'),
  validateNumericId('id'),
  updateEvidence
);

// Hash verification: Admin, Investigator, Forensic Examiner, Lab Technician, Auditor
router.post(
  '/:id/verify-hash',
  requireRoles('Admin', 'Investigator', 'Forensic Examiner', 'Lab Technician', 'Auditor'),
  validateNumericId('id'),
  validateBody(['providedHash']),
  verifyHash
);

export default router;
