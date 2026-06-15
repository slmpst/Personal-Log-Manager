import { Request, Response, NextFunction } from 'express';
import * as filesService from './files.service';
import * as filesValidation from './files.validation';

export const getProjectFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const files = await filesService.listProjectFiles(projectId);
    res.json(files);
  } catch (error) {
    next(error);
  }
};

export const createFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, data } = filesValidation.validateCreateFile(req.body);
    if (error || !data) {
      res.status(400);
      throw new Error(error || 'Invalid request data');
    }
    const file = await filesService.createFile(data.projectId, data.type, data.title);
    res.status(201).json(file);
  } catch (error) {
    next(error);
  }
};

export const updateFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { error, data } = filesValidation.validateUpdateFile(req.body);
    if (error || !data) {
      res.status(400);
      throw new Error(error || 'Invalid request data');
    }
    const file = await filesService.updateFile(id, data);
    res.json(file);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await filesService.deleteFile(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const reorderFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, data } = filesValidation.validateReorderFiles(req.body);
    if (error || !data) {
      res.status(400);
      throw new Error(error || 'Invalid request data');
    }
    await filesService.reorderFiles(data.projectId, data.orderedIds);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const moveFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { error, data } = filesValidation.validateMoveFile(req.body);
    if (error || !data) {
      res.status(400);
      throw new Error(error || 'Invalid request data');
    }
    await filesService.moveFile(id, data.targetProjectId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const searchFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = req.query.q;
    if (typeof query !== 'string' || !query.trim()) {
      res.status(400);
      throw new Error('Query parameter "q" is required and must be a string');
    }
    const files = await filesService.searchFiles(query.trim());
    res.json(files);
  } catch (error) {
    next(error);
  }
};
