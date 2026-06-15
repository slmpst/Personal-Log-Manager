import { Request, Response, NextFunction } from 'express';
import * as projectsService from './projects.service';
import * as projectsValidation from './projects.validation';

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const projects = await projectsService.listProjects();
    res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, data } = projectsValidation.validateCreateProject(req.body);
    if (error || !data) {
      res.status(400);
      throw new Error(error || 'Invalid request data');
    }
    const project = await projectsService.createProject(data.name, data.color);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { error, data } = projectsValidation.validateUpdateProject(req.body);
    if (error || !data) {
      res.status(400);
      throw new Error(error || 'Invalid request data');
    }
    const project = await projectsService.updateProject(id, data);
    res.json(project);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await projectsService.deleteProject(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const reorderProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, data } = projectsValidation.validateReorderProjects(req.body);
    if (error || !data) {
      res.status(400);
      throw new Error(error || 'Invalid request data');
    }
    await projectsService.reorderProjects(data.orderedIds);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
