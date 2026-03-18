import { Router } from 'express';
import { platformAuthController } from './platform-auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', platformAuthController.register);
router.post('/login', platformAuthController.login);
router.get('/me', requireAuth, platformAuthController.me);

export default router;
