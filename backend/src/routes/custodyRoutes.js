import { Router } from 'express';
import { 
  getCustodyLedger, 
  getCustodyByEvidenceId,
  transferCustody, 
  testTriggerUpdate, 
  testTriggerDelete 
} from '../controllers/custodyController.js';
import { validateBody, validateNumericId } from '../middleware/validate.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

// Protect all chain of custody routes
router.use(authenticateToken);

router.get('/', getCustodyLedger);
router.get('/:evidenceId', validateNumericId('evidenceId'), getCustodyByEvidenceId);

// Transfer custody: Admin, Investigator, Forensic Examiner, Lab Technician, Evidence Custodian
router.post(
  '/transfer',
  requireRoles('Admin', 'Investigator', 'Forensic Examiner', 'Lab Technician', 'Evidence Custodian'),
  validateBody(['evidenceId', 'newStatus']),
  transferCustody
);

// Immutability trigger test endpoints (Admin only)
router.post('/test-update-trigger', requireRoles('Admin'), testTriggerUpdate);
router.post('/test-delete-trigger', requireRoles('Admin'), testTriggerDelete);

export default router;
