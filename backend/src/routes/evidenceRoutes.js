import { Router } from 'express';
import { 
  getEvidence, 
  getEvidenceById, 
  registerEvidence, 
  uploadEvidence,
  downloadEvidenceFile,
  verifyEvidenceFile,
  updateEvidence, 
  verifyHash 
} from '../controllers/evidenceController.js';
import { validateBody, validateNumericId } from '../middleware/validate.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { evidenceUpload } from '../middleware/upload.js';

const router = Router();

// Protect all evidence endpoints with authentication
router.use(authenticateToken);

router.get('/', getEvidence);
router.get('/:id', validateNumericId('id'), getEvidenceById);

// Download physical evidence file from secure vault
router.get('/:id/file', validateNumericId('id'), downloadEvidenceFile);

// Register evidence via JSON: Admin and Investigator
router.post(
  '/',
  requireRoles('Admin', 'Investigator'),
  validateBody(['description', 'caseId', 'hashValue']),
  registerEvidence
);

// Ingest evidence with actual physical file upload (computes SHA-256 byte hash): Admin and Investigator
router.post(
  '/upload',
  requireRoles('Admin', 'Investigator'),
  evidenceUpload.single('file'),
  uploadEvidence
);

// Re-verify physical evidence file on disk: Admin, Investigator, Forensic Examiner, Lab Technician, Auditor
router.post(
  '/:id/verify-file',
  requireRoles('Admin', 'Investigator', 'Forensic Examiner', 'Lab Technician', 'Auditor'),
  validateNumericId('id'),
  verifyEvidenceFile
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
