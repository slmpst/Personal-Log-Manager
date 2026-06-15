import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project } from '../types';
import { Settings, GripVertical } from 'lucide-react';

interface SortableProjectItemProps {
  project: Project;
  isActive: boolean;
  isEditing: boolean;
  onStartEdit: (project: Project) => void;
  onSelect: (id: string) => void;
}

export const SortableProjectItem: React.FC<SortableProjectItemProps> = ({
  project,
  isActive,
  isEditing,
  onStartEdit,
  onSelect,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `project:${project.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isEditing && onSelect(project.id)}
      className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-all duration-200 border ${
        isActive
          ? 'bg-zinc-800/60 text-zinc-100 font-medium border-zinc-700/30'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20 border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0"
        >
          <GripVertical size={13} />
        </div>

        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <span
          className="truncate text-[13.5px]"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartEdit(project);
          }}
        >
          {project.name}
        </span>
        {project.fileCount !== undefined && project.fileCount > 0 && (
          <span className="text-[10px] text-zinc-500 font-semibold bg-zinc-950 px-1.5 py-0.5 rounded-full border border-zinc-800 shrink-0">
            {project.fileCount}
          </span>
        )}
      </div>

      {!isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(project);
          }}
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-zinc-200 transition-all p-0.5 rounded text-zinc-500 hover:bg-zinc-800 shrink-0"
          title="Düzenle / Yeniden Adlandır"
        >
          <Settings size={13} />
        </button>
      )}
    </div>
  );
};
