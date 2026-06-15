import { Router } from 'express';
import * as aiController from './ai.controller';

const router = Router();

router.post('/chat', aiController.chatWithProject);
router.post('/editor', aiController.runEditorCommand);
router.post('/project-summary', aiController.generateProjectSummary);

export default router;
