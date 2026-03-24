import { Router } from 'express';
import { aiController } from './ai.controller';
import { optionalAuth } from '../../middleware/auth.middleware';
import { requirementsLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

// Routes
router.get('/providers', (req, res) => aiController.getProviders(req, res));
router.post(
    '/generate',
    optionalAuth,
    (req, res) => aiController.generate(req, res)
);
router.post(
    '/generate/v2',
    optionalAuth,
    (req, res) => aiController.generateV2(req, res)
);
router.post('/design-to-code', (req, res) => aiController.designToCode(req, res));
router.post('/refine', optionalAuth, (req, res) => aiController.refine(req, res));
router.post('/chat', optionalAuth, (req, res) => aiController.chat(req, res));

// Requirements gathering routes — these do NOT consume generation quota
router.post(
    '/requirements',
    requirementsLimiter,
    optionalAuth,
    aiController.getRequirementsQuestions
);

router.post(
    '/requirements/compile',
    requirementsLimiter,
    optionalAuth,
    aiController.compileRequirements
);

export { router as aiRoutes };
