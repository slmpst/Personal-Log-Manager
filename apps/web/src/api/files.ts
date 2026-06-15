import { apiRequest } from './client';
import { DevFile, FileType } from '../types';
import { offlineDb } from './offlineDb';
import { syncManager } from './syncManager';

export const fetchProjectFiles = async (projectId: string): Promise<DevFile[]> => {
  if (syncManager.isOnline) {
    try {
      const data = await apiRequest<DevFile[]>(`/projects/${projectId}/files`);
      await offlineDb.saveFiles(data);
      return data;
    } catch (err) {
      console.warn('Failed to fetch files from server, loading from offline cache:', err);
    }
  }
  return offlineDb.getFilesByProject(projectId);
};

export const createFile = async (projectId: string, type: FileType, title: string): Promise<DevFile> => {
  if (syncManager.isOnline) {
    const data = await apiRequest<DevFile>('/files', {
      method: 'POST',
      body: JSON.stringify({ projectId, type, title }),
    });
    await offlineDb.saveFile(data);
    return data;
  } else {
    const tempId = `temp_file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tempFile: DevFile = {
      id: tempId,
      projectId,
      type,
      title,
      content: '',
      order: 999,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await offlineDb.saveFile(tempFile);
    await offlineDb.enqueue('create_file', { projectId, type, title, tempId });
    return tempFile;
  }
};

export const updateFile = async (
  id: string,
  data: Partial<Pick<DevFile, 'title' | 'content' | 'type' | 'pinned'>>
): Promise<DevFile> => {
  if (syncManager.isOnline) {
    const updated = await apiRequest<DevFile>(`/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await offlineDb.saveFile(updated);
    return updated;
  } else {
    const db = await offlineDb.init();
    const existing = await new Promise<DevFile | undefined>((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!existing) throw new Error('File not found locally');

    const updatedFile = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await offlineDb.saveFile(updatedFile);
    await offlineDb.enqueue('update_file', { id, data });
    return updatedFile;
  }
};

export const deleteFile = async (id: string): Promise<{ success: boolean }> => {
  if (syncManager.isOnline) {
    const res = await apiRequest<{ success: boolean }>(`/files/${id}`, {
      method: 'DELETE',
    });
    await offlineDb.deleteFile(id);
    return res;
  } else {
    await offlineDb.deleteFile(id);
    await offlineDb.enqueue('delete_file', { id });
    return { success: true };
  }
};

export const reorderFiles = async (projectId: string, orderedIds: string[]): Promise<{ success: boolean }> => {
  if (syncManager.isOnline) {
    const res = await apiRequest<{ success: boolean }>('/files/reorder', {
      method: 'POST',
      body: JSON.stringify({ projectId, orderedIds }),
    });
    const files = await offlineDb.getFilesByProject(projectId);
    const updated = files.map(f => {
      const idx = orderedIds.indexOf(f.id);
      return idx !== -1 ? { ...f, order: idx } : f;
    }).sort((a, b) => a.order - b.order);
    await offlineDb.saveFiles(updated);
    return res;
  } else {
    const files = await offlineDb.getFilesByProject(projectId);
    const updated = files.map(f => {
      const idx = orderedIds.indexOf(f.id);
      return idx !== -1 ? { ...f, order: idx } : f;
    }).sort((a, b) => a.order - b.order);
    await offlineDb.saveFiles(updated);
    await offlineDb.enqueue('reorder_files', { projectId, orderedIds });
    return { success: true };
  }
};

export const moveFile = async (id: string, targetProjectId: string): Promise<{ success: boolean }> => {
  if (syncManager.isOnline) {
    const res = await apiRequest<{ success: boolean }>(`/files/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetProjectId }),
    });
    const db = await offlineDb.init();
    const file = await new Promise<DevFile | undefined>((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (file) {
      file.projectId = targetProjectId;
      file.pinned = false;
      await offlineDb.saveFile(file);
    }
    return res;
  } else {
    const db = await offlineDb.init();
    const file = await new Promise<DevFile | undefined>((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (file) {
      file.projectId = targetProjectId;
      file.pinned = false;
      await offlineDb.saveFile(file);
    }
    await offlineDb.enqueue('move_file', { id, targetProjectId });
    return { success: true };
  }
};

export const searchFiles = async (q: string) => {
  if (syncManager.isOnline) {
    try {
      return await apiRequest<(DevFile & { project: { id: string; name: string; color: string } })[]>(
        `/search?q=${encodeURIComponent(q)}`
      );
    } catch (err) {
      console.warn('Search API failed, falling back to local search:', err);
    }
  }
  
  const db = await offlineDb.init();
  const allFiles = await new Promise<DevFile[]>((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  
  const projects = await offlineDb.getProjects();
  const lowerQ = q.toLowerCase();
  
  return allFiles
    .filter(f => f.title.toLowerCase().includes(lowerQ) || f.content.toLowerCase().includes(lowerQ))
    .map(f => {
      const p = projects.find(proj => proj.id === f.projectId) || { id: f.projectId, name: 'Bilinmeyen Proje', color: '#6366f1' };
      return {
        ...f,
        project: {
          id: p.id,
          name: p.name,
          color: p.color
        }
      };
    });
};

export const uploadFile = (file: File) => {
  if (!syncManager.isOnline) {
    return Promise.reject(new Error('Dosya yükleyebilmek için internet bağlantısı gereklidir.'));
  }
  const formData = new FormData();
  formData.append('file', file);
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787/api';
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: formData
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Dosya yükleme hatası.');
    }
    return res.json() as Promise<{ url: string; filename: string; savedName: string; size: number; mimetype: string }>;
  });
};

export interface NoteAttachment {
  id: string;
  fileId: string;
  name: string;
  url: string;
  size: number;
  mimetype: string;
  createdAt: string;
}

export const fetchAttachments = (fileId: string) => {
  if (!syncManager.isOnline) {
    return Promise.resolve([] as NoteAttachment[]); // return empty attachments when offline
  }
  return apiRequest<NoteAttachment[]>(`/files/${fileId}/attachments`);
};

export const uploadAttachment = (fileId: string, file: File) => {
  if (!syncManager.isOnline) {
    return Promise.reject(new Error('Dosya yükleyebilmek için internet bağlantısı gereklidir.'));
  }
  const formData = new FormData();
  formData.append('file', file);
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787/api';
  return fetch(`${baseUrl}/files/${fileId}/attachments`, {
    method: 'POST',
    body: formData
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Eklenti yüklenemedi.');
    }
    return res.json() as Promise<NoteAttachment>;
  });
};

export const deleteAttachment = (id: string) => {
  if (!syncManager.isOnline) {
    return Promise.reject(new Error('Eklenti silebilmek için internet bağlantısı gereklidir.'));
  }
  return apiRequest<{ success: boolean }>(`/attachments/${id}`, {
    method: 'DELETE',
  });
};

