import { create } from 'zustand';

interface UiState {
  activeProjectId: string | null;
  activeFileId: string | null;
  editorMode: 'edit' | 'preview' | 'split';
  searchQuery: string;
  viewMode: 'editor' | 'calendar';
  setActiveProjectId: (id: string | null) => void;
  setActiveFileId: (id: string | null) => void;
  setEditorMode: (mode: 'edit' | 'preview' | 'split') => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'editor' | 'calendar') => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeProjectId: null,
  activeFileId: null,
  editorMode: 'split',
  searchQuery: '',
  viewMode: 'editor',
  setActiveProjectId: (id) => set({ activeProjectId: id, activeFileId: null, viewMode: 'editor' }),
  setActiveFileId: (id) => set({ activeFileId: id, viewMode: 'editor' }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
