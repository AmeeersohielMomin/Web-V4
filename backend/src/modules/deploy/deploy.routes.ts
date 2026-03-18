import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { deployController } from './deploy.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const deployLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: 'Too many deploy requests. Please wait a few minutes.'
  }
});

const router = Router();

router.get('/github/oauth/start', deployController.githubOauthStart);
router.get('/github/callback', deployController.githubOauthCallback);

router.use(requireAuth);
router.use(deployLimiter);

router.post('/vercel', deployController.deployToVercel);
router.get('/vercel/status/:deployId', deployController.getVercelStatus);
router.post('/github', deployController.pushToGitHub);
router.post('/railway', deployController.deployToRailway);
router.get('/railway/status/:serviceId', deployController.getRailwayStatus);
router.get('/status/:projectId', deployController.getAllDeployStatus);

export default router;
