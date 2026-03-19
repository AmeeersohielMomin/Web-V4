import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { aiController } from './ai.controller';
import { optionalAuth } from '../../middleware/auth.middleware';
import { generationLimiter } from '../../middleware/rateLimit.middleware';
import { checkGenerationQuota } from '../../middleware/generationQuota.middleware';

const router = Router();

const isDev = process.env.NODE_ENV !== 'production';

// Rate limiter for free-tier users (no API key provided)
// In development: 500 req/hour so local testing is never blocked
// In production: 15 req/day per IP on free tier
const freeTierLimiter = rateLimit({
    windowMs: isDev ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 1hr dev, 24hr prod
    max: isDev ? 500 : 15,
    skip: (req: Request) => {
        // Skip rate limiting if:
        // 1. User provides their own API key (BYOK)
        // 2. Any request in development mode (avoid dev friction)
        if (isDev) return true;
        return !!(req.body?.apiKey && req.body.apiKey.trim());
    },
    handler: (req: Request, res: Response) => {
        // Must respond as SSE since the client reads SSE events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();
        res.write(`event: error\ndata: ${JSON.stringify({
            message: 'Free tier limit reached (15 generations/day). Please provide your own API key for unlimited access.'
        })}\n\n`);
        res.end();
    }
});

// Routes
router.get('/providers', (req, res) => aiController.getProviders(req, res));
router.post(
    '/generate',
    freeTierLimiter,
    generationLimiter,
    optionalAuth,
    checkGenerationQuota,
    (req, res) => aiController.generate(req, res)
);
router.post('/design-to-code', freeTierLimiter, (req, res) => aiController.designToCode(req, res));
router.post('/refine', freeTierLimiter, optionalAuth, (req, res) => aiController.refine(req, res));

// Requirements gathering routes — these do NOT consume generation quota
// freeTierLimiter and optionalAuth are already imported in this file
router.post(
    '/requirements',
    freeTierLimiter,
    optionalAuth,
    aiController.getRequirementsQuestions
);

router.post(
    '/requirements/compile',
    freeTierLimiter,
    optionalAuth,
    aiController.compileRequirements
);

export { router as aiRoutes };
