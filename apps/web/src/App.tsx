import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileList } from './components/FileList';
import { Editor } from './components/Editor';
import { SearchPanel } from './components/SearchPanel';
import { CalendarView } from './components/CalendarView';
import { useUiStore } from './store/useUiStore';
import { Project, DevFile, FileType } from './types';
import * as projectsApi from './api/projects';
import * as filesApi from './api/files';
import { Search, FolderOpen, Settings2, Loader2, Check } from 'lucide-react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { AiChatPanel } from './components/AiChatPanel';
import { AiKeyModal } from './components/AiKeyModal';
import * as aiApi from './api/ai';
import { syncManager } from './api/syncManager';


function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<DevFile[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(syncManager.isOnline);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setIsOnline);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleSyncStatus = (e: Event) => {
      const status = (e as CustomEvent).detail;
      setSyncStatus(status);
      if (status === 'success') {
        setReloadTrigger(prev => prev + 1);
      }
    };
    window.addEventListener('sync-status', handleSyncStatus);
    return () => window.removeEventListener('sync-status', handleSyncStatus);
  }, []);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('layout_sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });

  const [fileListWidth, setFileListWidth] = useState(() => {
    const saved = localStorage.getItem('layout_file_list_width');
    return saved ? parseInt(saved, 10) : 280;
  });

  useEffect(() => {
    localStorage.setItem('layout_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('layout_file_list_width', fileListWidth.toString());
  }, [fileListWidth]);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(450, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleFileListMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = fileListWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(500, startWidth + deltaX));
      setFileListWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Prepopulate user's OpenAI API key if not set
  useEffect(() => {
    const defaultKey = "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";
    const existing = localStorage.getItem('gemini_api_key');
    if (!existing) {
      localStorage.setItem('gemini_api_key', defaultKey);
    }
  }, []);

  const handleGenerateAiReport = async () => {
    if (!activeProjectId) return;
    try {
      const response = await aiApi.generateProjectSummary(activeProjectId);
      const dateStr = new Date().toLocaleDateString('tr-TR');
      await handleCreateFile('rapor', `AI Proje Raporu - ${dateStr}`, response.summary);
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      const isKeyError = err.message?.toLowerCase().includes('api anahtarı') || err.message?.toLowerCase().includes('api key');
      if (isKeyError) {
        setIsKeyModalOpen(true);
      } else {
        alert(err.message || 'Rapor oluşturulurken bir hata meydana geldi.');
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { activeProjectId, activeFileId, setActiveProjectId, setActiveFileId, setSearchQuery, viewMode } = useUiStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    // 1. Projects Reordering
    if (activeIdStr.startsWith('project:') && overIdStr.startsWith('project:')) {
      const activeProjId = activeIdStr.replace('project:', '');
      const overProjId = overIdStr.replace('project:', '');

      if (activeProjId === overProjId) return;

      const oldIndex = projects.findIndex((p) => p.id === activeProjId);
      const newIndex = projects.findIndex((p) => p.id === overProjId);

      const updatedProjects = arrayMove(projects, oldIndex, newIndex);
      setProjects(updatedProjects);

      try {
        await projectsApi.reorderProjects(updatedProjects.map((p) => p.id));
      } catch (err: any) {
        const rollback = await projectsApi.fetchProjects();
        setProjects(rollback);
        alert('Proje sıralaması güncellenemedi: ' + err.message);
      }
    }

    // 2. Files Reordering or Moving to another Project
    if (activeIdStr.startsWith('file:')) {
      const activeFileIdVal = activeIdStr.replace('file:', '');

      // Case A: Reorder inside same project
      if (overIdStr.startsWith('file:')) {
        const overFileIdVal = overIdStr.replace('file:', '');
        if (activeFileIdVal === overFileIdVal) return;

        const oldIndex = files.findIndex((f) => f.id === activeFileIdVal);
        const newIndex = files.findIndex((f) => f.id === overFileIdVal);

        const updatedFiles = arrayMove(files, oldIndex, newIndex);
        setFiles(updatedFiles);

        try {
          await filesApi.reorderFiles(activeProjectId!, updatedFiles.map((f) => f.id));
        } catch (err: any) {
          const rollback = await filesApi.fetchProjectFiles(activeProjectId!);
          setFiles(rollback);
          alert('Dosya sıralaması güncellenemedi: ' + err.message);
        }
      }

      // Case B: Move file to another project
      if (overIdStr.startsWith('project:')) {
        const targetProjId = overIdStr.replace('project:', '');
        if (targetProjId === activeProjectId) return;

        setFiles((prev) => prev.filter((f) => f.id !== activeFileIdVal));
        if (activeFileId === activeFileIdVal) {
          setActiveFileId(null);
        }

        try {
          await filesApi.moveFile(activeFileIdVal, targetProjId);
          const updatedProjList = await projectsApi.fetchProjects();
          setProjects(updatedProjList);
        } catch (err: any) {
          const rollback = await filesApi.fetchProjectFiles(activeProjectId!);
          setFiles(rollback);
          alert('Dosya taşınamadı: ' + err.message);
        }
      }
    }
  };

  // Load projects initially
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsApi.fetchProjects();
        setProjects(data);
        if (data.length > 0 && !activeProjectId && !isMobile) {
          setActiveProjectId(data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Projeler yüklenirken hata oluştu');
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, [setActiveProjectId, isMobile, reloadTrigger]);

  // Load files when active project changes
  useEffect(() => {
    if (!activeProjectId) {
      setFiles([]);
      return;
    }
    const loadFiles = async () => {
      try {
        const data = await filesApi.fetchProjectFiles(activeProjectId);
        setFiles(data);
        if (data.length > 0 && !isMobile) {
          const firstFile = data.find(f => f.pinned) || data[0];
          setActiveFileId(firstFile.id);
        } else {
          setActiveFileId(null);
        }
      } catch (err: any) {
        setError(err.message || 'Dosyalar yüklenirken hata oluştu');
      }
    };
    loadFiles();
  }, [activeProjectId, setActiveFileId, isMobile, reloadTrigger]);

  // Listen to keyboard shortcut '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !document.activeElement?.classList.contains('w-md-editor-text-input')
      ) {
        e.preventDefault();
        setSearchQuery(' ');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchQuery]);

  // Project Actions
  const handleCreateProject = async (name: string, color: string) => {
    try {
      const newProj = await projectsApi.createProject(name, color);
      const updated = await projectsApi.fetchProjects();
      setProjects(updated);
      setActiveProjectId(newProj.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateProject = async (id: string, data: { name?: string; color?: string }) => {
    try {
      await projectsApi.updateProject(id, data);
      const updated = await projectsApi.fetchProjects();
      setProjects(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Bu projeyi ve tüm dosyalarını silmek istediğinize emin misiniz?')) return;
    try {
      await projectsApi.deleteProject(id);
      const updated = await projectsApi.fetchProjects();
      setProjects(updated);
      if (activeProjectId === id) {
        setActiveProjectId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // File Actions
  const handleCreateFile = async (type: FileType, title: string, templateContent?: string) => {
    if (!activeProjectId) return;
    try {
      const newFile = await filesApi.createFile(activeProjectId, type, title);
      let finalFile = newFile;
      if (templateContent) {
        finalFile = await filesApi.updateFile(newFile.id, { content: templateContent });
      }
      setFiles(prev => [...prev, finalFile]);
      setActiveFileId(finalFile.id);
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, fileCount: (p.fileCount || 0) + 1 } : p));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateFile = async (id: string, data: Partial<Pick<DevFile, 'title' | 'content' | 'type' | 'pinned'>>) => {
    try {
      const updatedFile = await filesApi.updateFile(id, data);
      setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updatedFile } : f));
    } catch (err: any) {
      alert(err.message);
      throw err;
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;
    try {
      await filesApi.deleteFile(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      if (activeFileId === id) {
        setActiveFileId(null);
      }
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, fileCount: Math.max(0, (p.fileCount || 1) - 1) } : p));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden text-zinc-300 relative font-sans">
        {/* Global Search Overlay Panel */}
        <SearchPanel />

        {/* Connection & Sync Status Indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
          {!isOnline && (
            <div className="bg-amber-955/90 border border-amber-800 text-amber-200 px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 shadow-2xl backdrop-blur-md animate-bounce">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Çevrimdışı Çalışıyorsunuz (Veriler Yerel Kaydediliyor)</span>
            </div>
          )}
          {isOnline && syncStatus === 'syncing' && (
            <div className="bg-indigo-955/90 border border-indigo-850 text-indigo-200 px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 shadow-2xl backdrop-blur-md">
              <Loader2 size={10} className="animate-spin text-indigo-400" />
              <span>Değişiklikler Sunucuya Eşitleniyor...</span>
            </div>
          )}
          {isOnline && syncStatus === 'success' && (
            <div className="bg-emerald-955/90 border border-emerald-850 text-emerald-200 px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 shadow-2xl backdrop-blur-md animate-pulse">
              <Check size={10} className="text-emerald-400" />
              <span>Eşitleme Tamamlandı</span>
            </div>
          )}
        </div>

      {error && (
        <div className="absolute top-4 right-4 bg-rose-950/90 border border-rose-800 text-rose-200 px-4 py-2.5 rounded-lg text-xs z-50 flex items-center gap-2.5 shadow-2xl backdrop-blur-md">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold hover:text-white transition-colors cursor-pointer ml-1">✕</button>
        </div>
      )}

      {/* Pane 1: Sidebar */}
      {loadingProjects ? (
        <div style={{ width: isMobile ? '100%' : `${sidebarWidth}px` }} className="shrink-0 bg-zinc-900 border-r border-zinc-850 flex items-center justify-center">
          <span className="text-xs text-zinc-500 animate-pulse">Yükleniyor...</span>
        </div>
      ) : (
        <div 
          style={{ width: isMobile ? '100%' : `${sidebarWidth}px` }}
          className={`flex-col h-full shrink-0 relative ${activeProjectId ? 'hidden md:flex' : 'flex'}`}
        >
          <Sidebar
            projects={projects}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
          />
          {/* Global search trigger & Settings in sidebar bottom */}
          <div className="p-3 bg-zinc-900 border-t border-zinc-850 flex items-center gap-2">
            <button
              onClick={() => setSearchQuery(' ')}
              className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-xs text-zinc-550 hover:text-zinc-300 transition-all border border-zinc-850/50 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search size={14} /> Devloglarda ara...
              </span>
              <kbd className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 font-sans">
                /
              </kbd>
            </button>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="p-2 bg-zinc-950 hover:bg-zinc-800 rounded-lg text-zinc-450 hover:text-indigo-400 border border-zinc-850/50 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="AI Ayarları"
            >
              <Settings2 size={14} />
            </button>
          </div>
          {!isMobile && (
            <div
              onMouseDown={handleSidebarMouseDown}
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize group z-50 select-none"
            >
              <div className="absolute inset-y-0 right-0 w-[2px] bg-transparent group-hover:bg-indigo-500/40 group-active:bg-indigo-500 transition-colors" />
            </div>
          )}
        </div>
      )}

      {/* Pane 2: File List */}
      {activeProjectId && activeProject ? (
        <div 
          style={{ width: isMobile ? '100%' : `${fileListWidth}px` }}
          className={`${activeProjectId && !activeFileId ? 'flex' : 'hidden md:flex'} h-full shrink-0 relative`}
        >
          <FileList
            files={files}
            onCreateFile={handleCreateFile}
            onUpdateFile={handleUpdateFile}
            onDeleteFile={handleDeleteFile}
            activeProjectName={activeProject.name}
            onBack={() => setActiveProjectId(null)}
            onGenerateAiReport={handleGenerateAiReport}
            onToggleAiChat={() => setIsAiChatOpen(!isAiChatOpen)}
            isAiChatOpen={isAiChatOpen}
          />
          {!isMobile && (
            <div
              onMouseDown={handleFileListMouseDown}
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize group z-50 select-none"
            >
              <div className="absolute inset-y-0 right-0 w-[2px] bg-transparent group-hover:bg-indigo-500/40 group-active:bg-indigo-500 transition-colors" />
            </div>
          )}
        </div>
      ) : (
        <div 
          style={{ width: isMobile ? '100%' : `${fileListWidth}px` }}
          className="hidden md:flex bg-zinc-905 border-r border-zinc-800 items-center justify-center text-xs text-zinc-600 shrink-0"
        >
          Proje seçilmedi
        </div>
      )}

      {/* Pane 3: Markdown Editor or Calendar */}
      <div className={`flex-1 flex-col h-full overflow-hidden ${activeFileId || viewMode === 'calendar' ? 'flex' : 'hidden md:flex'}`}>
        {viewMode === 'calendar' ? (
          <CalendarView files={files} />
        ) : activeFile ? (
          <Editor
            file={activeFile}
            onUpdateFileContent={(id, content) => handleUpdateFile(id, { content })}
            onUpdateFileTitle={(id, title) => handleUpdateFile(id, { title })}
            onBack={() => setActiveFileId(null)}
            isAiChatOpen={isAiChatOpen}
            onToggleAiChat={() => setIsAiChatOpen(!isAiChatOpen)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-zinc-850 flex items-center justify-center text-zinc-600 mb-4">
              <FolderOpen size={32} className="stroke-[1.2]" />
            </div>
            <h3 className="text-zinc-300 font-semibold mb-1">Dosya Açık Değil</h3>
            <p className="text-zinc-650 text-xs max-w-xs leading-relaxed">
              Soldaki menüden bir dosya seçin veya yeni bir dosya oluşturarak düzenlemeye başlayın.
            </p>
          </div>
        )}
      </div>

      {/* AI Chat Panel Sidebar */}
      <AiChatPanel
        projectId={activeProjectId}
        activeFileId={activeFileId}
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        onPromptKeySetup={() => setIsKeyModalOpen(true)}
      />

      {/* AI Key Config Modal */}
      <AiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />
    </div>
  </DndContext>
);
}

export default App;
