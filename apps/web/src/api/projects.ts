import { apiRequest } from './client';
import { Project } from '../types';
import { offlineDb } from './offlineDb';
import { syncManager } from './syncManager';

export const fetchProjects = async (): Promise<Project[]> => {
  if (syncManager.isOnline) {
    try {
      const data = await apiRequest<Project[]>('/projects');
      await offlineDb.saveProjects(data);
      return data;
    } catch (err) {
      console.warn('Failed to fetch projects from server, loading from offline cache:', err);
    }
  }
  return offlineDb.getProjects();
};

export const createProject = async (name: string, color: string): Promise<Project> => {
  if (syncManager.isOnline) {
    const data = await apiRequest<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    await offlineDb.saveProject(data);
    return data;
  } else {
    const tempId = `temp_project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tempProject: Project = {
      id: tempId,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      color,
      icon: null,
      order: 999,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileCount: 0
    };
    await offlineDb.saveProject(tempProject);
    await offlineDb.enqueue('create_project', { name, color, tempId });
    return tempProject;
  }
};

export const updateProject = async (
  id: string,
  data: Partial<Pick<Project, 'name' | 'color' | 'icon' | 'archived'>>
): Promise<Project> => {
  if (syncManager.isOnline) {
    const updated = await apiRequest<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await offlineDb.saveProject(updated);
    return updated;
  } else {
    const projects = await offlineDb.getProjects();
    const existing = projects.find(p => p.id === id);
    if (!existing) throw new Error('Project not found locally');
    
    const updatedProject = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await offlineDb.saveProject(updatedProject);
    await offlineDb.enqueue('update_project', { id, data });
    return updatedProject;
  }
};

export const deleteProject = async (id: string): Promise<{ success: boolean }> => {
  if (syncManager.isOnline) {
    const res = await apiRequest<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    });
    await offlineDb.deleteProject(id);
    return res;
  } else {
    await offlineDb.deleteProject(id);
    await offlineDb.enqueue('delete_project', { id });
    return { success: true };
  }
};

export const reorderProjects = async (orderedIds: string[]): Promise<{ success: boolean }> => {
  if (syncManager.isOnline) {
    const res = await apiRequest<{ success: boolean }>('/projects/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
    const projects = await offlineDb.getProjects();
    const updated = projects.map(p => {
      const idx = orderedIds.indexOf(p.id);
      return idx !== -1 ? { ...p, order: idx } : p;
    }).sort((a, b) => a.order - b.order);
    await offlineDb.saveProjects(updated);
    return res;
  } else {
    const projects = await offlineDb.getProjects();
    const updated = projects.map(p => {
      const idx = orderedIds.indexOf(p.id);
      return idx !== -1 ? { ...p, order: idx } : p;
    }).sort((a, b) => a.order - b.order);
    await offlineDb.saveProjects(updated);
    await offlineDb.enqueue('reorder_projects', { orderedIds });
    return { success: true };
  }
};

