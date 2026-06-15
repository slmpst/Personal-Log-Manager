import { FileType } from '@prisma/client';

const validFileTypes = Object.values(FileType);

export const validateCreateFile = (
  body: any
): { error?: string; data?: { projectId: string; type: FileType; title: string } } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be an object' };
  }
  const { projectId, type, title } = body;
  if (typeof projectId !== 'string' || !projectId.trim()) {
    return { error: 'projectId is required and must be a non-empty string' };
  }
  if (!validFileTypes.includes(type)) {
    return { error: `type must be one of: ${validFileTypes.join(', ')}` };
  }
  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'title is required and must be a non-empty string' };
  }
  return { data: { projectId: projectId.trim(), type, title: title.trim() } };
};

export const validateUpdateFile = (
  body: any
): {
  error?: string;
  data?: { title?: string; content?: string; type?: FileType; pinned?: boolean };
} => {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be an object' };
  }
  const { title, content, type, pinned } = body;
  const data: any = {};
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return { error: 'title must be a non-empty string' };
    }
    data.title = title.trim();
  }
  if (content !== undefined) {
    if (typeof content !== 'string') {
      return { error: 'content must be a string' };
    }
    data.content = content;
  }
  if (type !== undefined) {
    if (!validFileTypes.includes(type)) {
      return { error: `type must be one of: ${validFileTypes.join(', ')}` };
    }
    data.type = type;
  }
  if (pinned !== undefined) {
    if (typeof pinned !== 'boolean') {
      return { error: 'pinned must be a boolean' };
    }
    data.pinned = pinned;
  }
  return { data };
};

export const validateReorderFiles = (
  body: any
): { error?: string; data?: { projectId: string; orderedIds: string[] } } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be an object' };
  }
  const { projectId, orderedIds } = body;
  if (typeof projectId !== 'string' || !projectId.trim()) {
    return { error: 'projectId is required and must be a non-empty string' };
  }
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'string')) {
    return { error: 'orderedIds must be an array of strings' };
  }
  return { data: { projectId: projectId.trim(), orderedIds } };
};

export const validateMoveFile = (
  body: any
): { error?: string; data?: { targetProjectId: string } } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be an object' };
  }
  const { targetProjectId } = body;
  if (typeof targetProjectId !== 'string' || !targetProjectId.trim()) {
    return { error: 'targetProjectId is required and must be a non-empty string' };
  }
  return { data: { targetProjectId: targetProjectId.trim() } };
};
