import { Router } from 'express';
import { getUsers, login, createUser } from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/users', getUsers);
router.post('/login', validateBody(['username', 'password']), login);
router.post('/users', validateBody(['firstName', 'lastName', 'username', 'role']), createUser);

export default router;
