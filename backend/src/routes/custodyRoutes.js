import { Router } from 'express';
import { 
  getCustodyLedger, 
  transferCustody, 
  testTriggerUpdate, 
  testTriggerDelete 
} from '../controllers/custodyController.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', getCustodyLedger);
router.post('/transfer', validateBody(['evidenceId', 'newStatus']), transferCustody);
router.post('/test-update-trigger', testTriggerUpdate);
router.post('/test-delete-trigger', testTriggerDelete);

export default router;
