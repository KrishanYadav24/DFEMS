import { Router } from 'express';
import { 
  getCases, 
  getCaseById, 
  createCase, 
  updateCase, 
  updateCaseStatus 
} from '../controllers/caseController.js';
import { validateBody, validateNumericId } from '../middleware/validate.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

// Protect all case endpoints with authentication
router.use(authenticateToken);

// Read cases: Admin, Investigator, Legal Reviewer, Auditor, Forensic Examiner
router.get('/', getCases);
router.get('/:id', validateNumericId('id'), getCaseById);

// Create / Update cases: Admin and Investigator
router.post('/', requireRoles('Admin', 'Investigator'), validateBody(['title']), createCase);
router.put('/:id', requireRoles('Admin', 'Investigator'), validateNumericId('id'), updateCase);
router.put('/:id/status', requireRoles('Admin', 'Investigator'), validateNumericId('id'), validateBody(['status']), updateCaseStatus);

export default router;
