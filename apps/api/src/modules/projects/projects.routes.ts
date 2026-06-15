import { Router } from 'express';
import * as projectsController from './projects.controller';

const router = Router();

router.get('/', projectsController.getProjects);
router.post('/', projectsController.createProject);
router.post('/reorder', projectsController.reorderProjects);
router.patch('/:id', projectsController.updateProject);
router.delete('/:id', projectsController.deleteProject);

export default router;
