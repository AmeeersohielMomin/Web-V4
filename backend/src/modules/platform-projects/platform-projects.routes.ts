import { Router } from 'express';
import { platformProjectsController } from './platform-projects.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Public routes (template gallery)
router.get('/templates', platformProjectsController.listTemplates);
router.post('/templates/:templateId/clone', requireAuth, platformProjectsController.cloneTemplate);

// Authenticated routes
router.use(requireAuth);

router.get('/', platformProjectsController.list);
router.get('/:id', platformProjectsController.get);
router.get('/:id/download', platformProjectsController.download);
router.delete('/:id', platformProjectsController.delete);

// Version history
router.get('/:id/versions', platformProjectsController.getVersionHistory);
router.post('/:id/versions/restore', platformProjectsController.restoreVersion);

// Publish / unpublish
router.patch('/:id/public', platformProjectsController.togglePublic);

export default router;
