import React, { useState } from 'react';
import { Project } from '../types';
import { Plus, Trash2, Check, X, Folder, Archive, ChevronDown, RotateCcw } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableProjectItem } from './SortableProjectItem';

interface SidebarProps {
  projects: Project[];
  onCreateProject: (name: string, color: string) => Promise<void>;
  onUpdateProject: (id: string, data: { name?: string; color?: string; archived?: boolean }) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
];

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}) => {
  const { activeProjectId, setActiveProjectId } = useUiStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjects = projects.filter((p) => p.archived);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await onCreateProject(newProjectName.trim(), selectedColor);
    setNewProjectName('');
    setShowAddForm(false);
  };

  const handleStartEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setEditingColor(project.color);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    await onUpdateProject(id, { name: editingName.trim(), color: editingColor });
    setEditingProjectId(null);
  };

  return (
    <div className="w-full bg-zinc-900 border-r border-zinc-800 flex flex-col h-full select-none">
      {/* App Logo / Header */}
      <div className="p-6 border-b border-zinc-850 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Devlog Manager Logo" className="w-12 h-12 rounded-xl object-contain" />
          <span className="font-semibold text-zinc-200 tracking-wide text-sm md:text-base">Devlog Manager</span>
        </div>
      </div>

      {/* Projects Title and Add Button */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between text-xs font-medium text-zinc-500 tracking-wider uppercase">
        <span>Projeler</span>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-805"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Add Project Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="mx-4 my-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Proje İsmi..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className="w-5 h-5 rounded-full border border-zinc-800 transition-transform relative hover:scale-110 flex items-center justify-center"
                style={{ backgroundColor: c }}
              >
                {selectedColor === c && <Check size={10} className="text-white drop-shadow" />}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-2.5 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors font-medium"
            >
              Ekle
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <SortableContext items={activeProjects.map((p) => `project:${p.id}`)} strategy={verticalListSortingStrategy}>
          {activeProjects.map((project) => {
            const isActive = project.id === activeProjectId;
            const isEditing = project.id === editingProjectId;

            if (isEditing) {
              return (
                <div key={project.id} className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2.5 mx-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(project.id);
                      if (e.key === 'Escape') setEditingProjectId(null);
                    }}
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingColor(c)}
                        className="w-4 h-4 rounded-full border border-zinc-800 flex items-center justify-center transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}
                      >
                        {editingColor === c && <Check size={8} className="text-white" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-900">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onDeleteProject(project.id)}
                        className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                        title="Projeyi Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          await onUpdateProject(project.id, { archived: true });
                          setEditingProjectId(null);
                        }}
                        className="p-1 hover:text-amber-500 transition-colors cursor-pointer"
                        title="Projeyi Arşivle"
                      >
                        <Archive size={14} />
                      </button>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingProjectId(null)}
                        className="p-1 hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => handleSaveEdit(project.id)}
                        className="p-1 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <SortableProjectItem
                key={project.id}
                project={project}
                isActive={isActive}
                isEditing={isEditing}
                onStartEdit={handleStartEdit}
                onSelect={setActiveProjectId}
              />
            );
          })}
        </SortableContext>
        {activeProjects.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-xs text-zinc-600">
            <Folder size={24} className="mx-auto text-zinc-700 mb-2 stroke-[1.5]" />
            <span>Henüz aktif bir proje yok.</span>
          </div>
        )}
      </div>

      {/* Archived Projects List */}
      {archivedProjects.length > 0 && (
        <div className="mt-auto border-t border-zinc-850/80 p-3 bg-zinc-900/60 shrink-0">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-[10px]">
              <Archive size={12} className="text-zinc-650" /> Arşivlenmiş Projeler ({archivedProjects.length})
            </span>
            <ChevronDown size={12} className={`transform transition-transform duration-200 ${showArchived ? 'rotate-180' : ''}`} />
          </button>
          
          {showArchived && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
              {archivedProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/40 hover:bg-zinc-950/80 border border-zinc-900 transition-all text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate text-zinc-450">{project.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onUpdateProject(project.id, { archived: false })}
                      className="p-1 hover:text-indigo-400 hover:bg-zinc-805 rounded transition-colors text-zinc-600 cursor-pointer"
                      title="Arşivden Çıkar"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteProject(project.id)}
                      className="p-1 hover:text-red-400 hover:bg-zinc-805 rounded transition-colors text-zinc-600 cursor-pointer"
                      title="Projeyi Sil"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
