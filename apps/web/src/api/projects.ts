import { apiRequest } from './client';
import { Project } from '../types';

export const fetchProjects = () => apiRequest<Project[]>('/projects');

export const createProject = (name: string, color: string) =>
  apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });

export const updateProject = (
  id: string,
  data: Partial<Pick<Project, 'name' | 'color' | 'icon'>>
) =>
  apiRequest<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteProject = (id: string) =>
  apiRequest<{ success: boolean }>(`/projects/${id}`, {
    method: 'DELETE',
  });

export const reorderProjects = (orderedIds: string[]) =>
  apiRequest<{ success: boolean }>('/projects/reorder', {
    method: 'POST',
    body: JSON.stringify({ orderedIds }),
  });
