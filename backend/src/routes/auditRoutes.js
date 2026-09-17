import { Router } from 'express';
import { getAuditLogs, logEvent } from '../controllers/auditController.js';
import { validateBody } from '../middleware/validate.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

// Protect all audit routes
router.use(authenticateToken);

// View system security audit logs: Admin and Auditor only
router.get('/', requireRoles('Admin', 'Auditor'), getAuditLogs);

// Custom audit event emission: Authenticated users
router.post('/', validateBody(['action']), logEvent);

export default router;
