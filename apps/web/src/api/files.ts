import { apiRequest } from './client';
import { DevFile, FileType } from '../types';

export const fetchProjectFiles = (projectId: string) =>
  apiRequest<DevFile[]>(`/projects/${projectId}/files`);

export const createFile = (projectId: string, type: FileType, title: string) =>
  apiRequest<DevFile>('/files', {
    method: 'POST',
    body: JSON.stringify({ projectId, type, title }),
  });

export const updateFile = (
  id: string,
  data: Partial<Pick<DevFile, 'title' | 'content' | 'type' | 'pinned'>>
) =>
  apiRequest<DevFile>(`/files/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteFile = (id: string) =>
  apiRequest<{ success: boolean }>(`/files/${id}`, {
    method: 'DELETE',
  });

export const reorderFiles = (projectId: string, orderedIds: string[]) =>
  apiRequest<{ success: boolean }>('/files/reorder', {
    method: 'POST',
    body: JSON.stringify({ projectId, orderedIds }),
  });

export const moveFile = (id: string, targetProjectId: string) =>
  apiRequest<{ success: boolean }>(`/files/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ targetProjectId }),
  });

export const searchFiles = (q: string) =>
  apiRequest<(DevFile & { project: { id: string; name: string; color: string } })[]>(
    `/search?q=${encodeURIComponent(q)}`
  );

export const uploadFile = (file: File) => {
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

export const fetchAttachments = (fileId: string) =>
  apiRequest<NoteAttachment[]>(`/files/${fileId}/attachments`);

export const uploadAttachment = (fileId: string, file: File) => {
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

export const deleteAttachment = (id: string) =>
  apiRequest<{ success: boolean }>(`/attachments/${id}`, {
    method: 'DELETE',
  });
