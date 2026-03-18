import { Router } from 'express';
import { platformProjectsController } from './platform-projects.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', platformProjectsController.list);
router.get('/:id', platformProjectsController.get);
router.get('/:id/download', platformProjectsController.download);
router.delete('/:id', platformProjectsController.delete);

export default router;
