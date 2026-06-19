import { apiRequest } from './client';

const getAiHeaders = (): Record<string, string> => {
  const key = localStorage.getItem('gemini_api_key') || '';
  return key ? { 
    'x-gemini-key': key,
    'Authorization': `Bearer ${key}`
  } : {};
};

export const chatWithProject = (projectId: string, message: string, fileId: string | null) =>
  apiRequest<{ reply: string }>('/ai/chat', {
    method: 'POST',
    headers: getAiHeaders(),
    body: JSON.stringify({ projectId, message, fileId }),
  });

export const runEditorCommand = (command: string, content: string, selection: string | null) =>
  apiRequest<{ result: string }>('/ai/editor', {
    method: 'POST',
    headers: getAiHeaders(),
    body: JSON.stringify({ command, content, selection }),
  });

export const generateProjectSummary = (projectId: string) =>
  apiRequest<{ summary: string }>('/ai/project-summary', {
    method: 'POST',
    headers: getAiHeaders(),
    body: JSON.stringify({ projectId }),
  });
