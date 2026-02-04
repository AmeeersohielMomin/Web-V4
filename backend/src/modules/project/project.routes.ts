import { Router } from 'express';
import { ProjectController } from './project.controller';

const router = Router();
const projectController = new ProjectController();

router.post('/generate', projectController.generate);
router.post('/deploy-github', projectController.deployGithub);

export const projectRoutes = router;
