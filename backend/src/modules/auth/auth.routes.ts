import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();
const authController = new AuthController();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', authController.me);

export const authRoutes = router;
