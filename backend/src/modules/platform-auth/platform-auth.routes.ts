import { Router, Request, Response, NextFunction } from 'express';
import { platformAuthController } from './platform-auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimit.middleware';
import { PlatformUser } from './platform-user.model';

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;
  PlatformUser.findById(userId)
    .select('role')
    .then((user) => {
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, data: null, error: 'Admin access required' });
      }
      next();
    })
    .catch(() => {
      res.status(500).json({ success: false, data: null, error: 'Authorization check failed' });
    });
}

const router = Router();

// Public auth routes
router.post('/register', authLimiter, platformAuthController.register);
router.post('/login', authLimiter, platformAuthController.login);
router.post('/forgot-password', authLimiter, platformAuthController.forgotPassword);
router.post('/reset-password', authLimiter, platformAuthController.resetPassword);

// Authenticated routes
router.get('/me', requireAuth, platformAuthController.me);
router.patch('/profile', requireAuth, platformAuthController.updateProfile);
router.post('/change-password', requireAuth, platformAuthController.changePassword);

// API key management
router.post('/api-keys', requireAuth, platformAuthController.saveApiKey);
router.delete('/api-keys/:provider', requireAuth, platformAuthController.removeApiKey);

// Admin routes
router.get('/admin/stats', requireAuth, requireAdmin, platformAuthController.getAdminStats);
router.get('/admin/users', requireAuth, requireAdmin, platformAuthController.listUsers);

export default router;
