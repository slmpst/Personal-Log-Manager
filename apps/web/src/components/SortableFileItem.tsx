import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DevFile, FileType } from '../types';
import { Pin, Trash2, GripVertical, FileText, Terminal, BookOpen, StickyNote, CheckSquare, Edit2 } from 'lucide-react';

interface SortableFileItemProps {
  file: DevFile;
  isActive: boolean;
  onSelect: (id: string) => void;
  onUpdateFile: (id: string, data: { title?: string; pinned?: boolean }) => void;
  onDeleteFile: (id: string) => void;
}

const FILE_TYPE_ICONS: Record<FileType, React.ReactNode> = {
  rapor: <FileText size={15} className="text-blue-400" />,
  devlog: <Terminal size={15} className="text-emerald-400" />,
  bilgiler: <BookOpen size={15} className="text-purple-400" />,
  notlar: <StickyNote size={15} className="text-amber-400" />,
  todo: <CheckSquare size={15} className="text-rose-400" />,
};

export const SortableFileItem: React.FC<SortableFileItemProps> = ({
  file,
  isActive,
  onSelect,
  onUpdateFile,
  onDeleteFile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(file.title);

  useEffect(() => {
    setEditingTitle(file.title);
  }, [file.title]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `file:${file.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleRenameSubmit = () => {
    if (editingTitle.trim() && editingTitle.trim() !== file.title) {
      onUpdateFile(file.id, { title: editingTitle.trim() });
    } else {
      setEditingTitle(file.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isEditing && onSelect(file.id)}
      className={`group flex items-center justify-between px-2 py-2.5 rounded-lg cursor-pointer transition-all duration-150 border ${
        isActive
          ? 'bg-zinc-800 text-zinc-100 border-zinc-700/30'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/10 border-transparent'
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

        <span className="shrink-0">{FILE_TYPE_ICONS[file.type]}</span>
        
        {isEditing ? (
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') {
                setEditingTitle(file.title);
                setIsEditing(false);
              }
            }}
            className="w-full bg-zinc-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="truncate text-xs font-medium"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {file.title}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Yeniden Adlandır"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateFile(file.id, { pinned: !file.pinned });
          }}
          className={`p-0.5 rounded hover:bg-zinc-700 transition-colors ${
            file.pinned ? 'text-indigo-400 opacity-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Pin size={13} className={file.pinned ? 'fill-indigo-400/20' : ''} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFile(file.id);
          }}
          className="p-0.5 rounded hover:bg-zinc-700 hover:text-red-400 text-zinc-500 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};
