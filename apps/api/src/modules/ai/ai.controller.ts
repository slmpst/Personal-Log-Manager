import { Request, Response, NextFunction } from 'express';
import * as aiService from './ai.service';

export const chatWithProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, message, fileId } = req.body;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required and must be a string' });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required and must be a string' });
    }

    const reply = await aiService.chatWithProject(
      projectId,
      message,
      fileId || null,
      req.headers
    );

    res.json({ reply });
  } catch (err: any) {
    next(err);
  }
};

export const runEditorCommand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { command, content, selection } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'command is required and must be a string' });
    }
    if (content === undefined || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required and must be a string' });
    }

    const result = await aiService.runEditorCommand(
      command,
      content,
      selection || null,
      req.headers
    );

    res.json({ result });
  } catch (err: any) {
    next(err);
  }
};

export const generateProjectSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.body;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required and must be a string' });
    }

    const summary = await aiService.generateProjectSummary(projectId, req.headers);
    res.json({ summary });
  } catch (err: any) {
    next(err);
  }
};
