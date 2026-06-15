import { Router } from 'express';
import * as filesController from './files.controller';

const router = Router();

router.post('/', filesController.createFile);
router.post('/reorder', filesController.reorderFiles);
router.patch('/:id', filesController.updateFile);
router.delete('/:id', filesController.deleteFile);
router.post('/:id/move', filesController.moveFile);

export default router;
