export type FileType = 'rapor' | 'devlog' | 'bilgiler' | 'notlar' | 'todo';

export interface Project {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  order: number;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
}

export interface DevFile {
  id: string;
  projectId: string;
  type: FileType;
  title: string;
  content: string;
  order: number;
  pinned: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}
