import { Router } from 'express';
import {
  generateCaseDossierPdf,
  generateCustodyCertPdf,
  generateIntegrityAuditPdf,
  generateAuditTrailPdf,
} from '../controllers/reportController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

// Protect all reporting endpoints with authentication
router.use(authenticateToken);

// 1. Full Judicial Case Dossier PDF (Role-authorized per case)
router.get('/case/:caseId/dossier', generateCaseDossierPdf);

// 2. ISO/IEC 27037 Chain of Custody Certificate PDF
router.get('/evidence/:evidenceId/custody', generateCustodyCertPdf);

// 3. Cryptographic Integrity Audit PDF
router.get('/case/:caseId/integrity', generateIntegrityAuditPdf);

// 4. System Security Audit Trail Report PDF (Admin and Auditor only)
router.get('/audit-trail', requireRoles('Admin', 'Auditor'), generateAuditTrailPdf);

export default router;
