import React, { useState, useEffect } from 'react';
import { DevFile, FileType } from '../types';
import { 
  Plus, Pin, Search, Settings2, ChevronLeft, Calendar, Download, Sparkles, Bot, Archive, ChevronDown
} from 'lucide-react';
import { useUiStore } from '../store/useUiStore';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableFileItem } from './SortableFileItem';
import JSZip from 'jszip';

interface FileListProps {
  files: DevFile[];
  onCreateFile: (type: FileType, title: string, templateContent?: string) => Promise<void>;
  onUpdateFile: (id: string, data: { title?: string; pinned?: boolean; type?: FileType; archived?: boolean }) => Promise<void>;
  onDeleteFile: (id: string) => Promise<void>;
  activeProjectName: string;
  onBack?: () => void;
  onGenerateAiReport?: () => void;
  onToggleAiChat?: () => void;
  isAiChatOpen?: boolean;
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  rapor: 'Rapor',
  devlog: 'Devlog',
  bilgiler: 'Bilgiler',
  notlar: 'Notlar',
  todo: 'Yapılacaklar',
};

const TEMPLATES: Record<string, { label: string; content: string }> = {
  empty: {
    label: 'Boş Şablon',
    content: ''
  },
  devlog: {
    label: 'Günlük Devlog 🚀',
    content: `# Günlük Devlog - ${new Date().toLocaleDateString('tr-TR')}

## Bugün Yapılanlar
- [ ] Yapılan iş 1
- [ ] Yapılan iş 2

## Karşılaşılan Sorunlar ve Çözümler
- **Sorun:** ...
- **Çözüm:** ...

## Yarın Yapılacaklar
- [ ] Yapılacak iş 1
- [ ] Yapılacak iş 2

## Notlar & Bulgular
...`
  },
  bug_report: {
    label: 'Bug Raporu 🐛',
    content: `# Hata Raporu: [Hata Adı]

## Hata Açıklaması
Hatanın ne olduğu ve nasıl gerçekleştiğine dair kısa açıklama.

## Yeniden Üretme Adımları (Steps to Reproduce)
1. ... adresine git.
2. ... butonuna tıkla.
3. Hatanın gerçekleştiğini gör.

## Beklenen Davranış
Normal şartlarda olması gereken davranış.

## Gerçekleşen Davranış
Hata sonucu ortaya çıkan durum.

## Ek Bilgiler / Ekran Görüntüleri
...`
  },
  meeting_note: {
    label: 'Toplantı Notu 📅',
    content: `# Toplantı Notu - [Konu]
**Tarih:** ${new Date().toLocaleDateString('tr-TR')}
**Katılımcılar:** ...

## Gündem Maddeleri
1. ...
2. ...

## Konuşulan Detaylar
- ...
- ...

## Alınan Kararlar & Aksiyon Maddeleri
- [ ] @isim - Aksiyon maddesi 1
- [ ] @isim - Aksiyon maddesi 2`
  },
  release_notes: {
    label: 'Yayın Notları 📦',
    content: `# Yayın Notları - v1.0.0 (${new Date().toLocaleDateString('tr-TR')})

## Yenilikler (Features)
- **Yeni Özellik:** Detaylı açıklama...

## İyileştirmeler (Improvements)
- Performans iyileştirmesi...

## Hata Düzeltmeleri (Bug Fixes)
- Çökme hatası giderildi...

## Kurulum / Güncelleme Notları
...`
  }
};

export const FileList: React.FC<FileListProps> = ({
  files,
  onCreateFile,
  onUpdateFile,
  onDeleteFile,
  activeProjectName,
  onBack,
  onGenerateAiReport,
  onToggleAiChat,
  isAiChatOpen,
}) => {
  const { activeFileId, setActiveFileId, viewMode, setViewMode } = useUiStore();
  const [localSearch, setLocalSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileType, setNewFileType] = useState<FileType>('notlar');
  const [selectedTemplate, setSelectedTemplate] = useState('empty');
  const [showArchived, setShowArchived] = useState(false);

  // Auto-set file type when template changes
  useEffect(() => {
    if (selectedTemplate === 'devlog') {
      setNewFileType('devlog');
    } else if (selectedTemplate === 'bug_report') {
      setNewFileType('rapor');
    } else if (selectedTemplate === 'meeting_note') {
      setNewFileType('notlar');
    } else if (selectedTemplate === 'release_notes') {
      setNewFileType('rapor');
    }
  }, [selectedTemplate]);

  const filteredFiles = files.filter(f => 
    f.title.toLowerCase().includes(localSearch.toLowerCase()) ||
    FILE_TYPE_LABELS[f.type].toLowerCase().includes(localSearch.toLowerCase())
  );

  const activeFilteredFiles = filteredFiles.filter(f => !f.archived);
  const archivedFilteredFiles = filteredFiles.filter(f => f.archived);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim()) return;
    const templateContent = TEMPLATES[selectedTemplate]?.content || '';
    await onCreateFile(newFileType, newFileTitle.trim(), templateContent);
    setNewFileTitle('');
    setSelectedTemplate('empty');
    setNewFileType('notlar');
    setShowAddForm(false);
  };

  const handleDownloadZip = async () => {
    if (files.length === 0) {
      alert('İndirilecek dosya bulunamadı.');
      return;
    }

    const zip = new JSZip();
    files.forEach((file) => {
      const safeTitle = file.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `${file.type}-${safeTitle}.md`;
      zip.file(filename, file.content);
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const safeProjectName = activeProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `project-${safeProjectName}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('ZIP dosyası oluşturulamadı: ' + err.message);
    }
  };

  const pinnedFiles = activeFilteredFiles.filter(f => f.pinned);
  const unpinnedFiles = activeFilteredFiles.filter(f => !f.pinned);

  return (
    <div className="w-full bg-zinc-900/40 border-r border-zinc-800 flex flex-col h-full select-none">
      {/* Active Project Title and Search */}
      <div className="p-4 border-b border-zinc-850 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="md:hidden p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors mr-1 shrink-0 cursor-pointer"
                title="Geri"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <span className="font-semibold text-xs text-zinc-400 tracking-wider truncate uppercase">
              {activeProjectName}
            </span>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {onGenerateAiReport && (
              <button
                onClick={onGenerateAiReport}
                className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-805 rounded transition-all cursor-pointer animate-pulse"
                title="Yapay Zeka ile Proje Raporu Üret"
              >
                <Sparkles size={14} />
              </button>
            )}
            {onToggleAiChat && (
              <button
                onClick={onToggleAiChat}
                className={`p-1.5 rounded transition-all cursor-pointer border ${
                  isAiChatOpen 
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                    : 'text-zinc-450 hover:text-zinc-300 border-transparent hover:bg-zinc-805'
                }`}
                title="AI Asistana Sor (Sohbet)"
              >
                <Bot size={14} />
              </button>
            )}
            <button
              onClick={handleDownloadZip}
              className="p-1.5 text-zinc-450 hover:text-zinc-300 hover:bg-zinc-805 rounded transition-all cursor-pointer"
              title="Projeyi ZIP Olarak İndir"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'calendar' ? 'editor' : 'calendar')}
              className={`p-1.5 rounded transition-all cursor-pointer border ${
                viewMode === 'calendar' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                  : 'text-zinc-450 hover:text-zinc-300 border-transparent hover:bg-zinc-805'
              }`}
              title="Takvim Görünümü"
            >
              <Calendar size={14} />
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-[11px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 px-1.5 py-1 rounded transition-all font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus size={11} /> Yeni
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Dosyalarda ara..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-750 transition-colors"
          />
        </div>
      </div>

      {/* Add File Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="m-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3 shrink-0">
          <input
            type="text"
            placeholder="Başlık..."
            value={newFileTitle}
            onChange={(e) => setNewFileTitle(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-505 font-semibold block uppercase">Şablon Seçin</span>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-350 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {Object.entries(TEMPLATES).map(([value, template]) => (
                <option key={value} value={value}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-zinc-505 font-semibold block uppercase">Tip Seçin</span>
            <select
              value={newFileType}
              onChange={(e) => setNewFileType(e.target.value as FileType)}
              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-350 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end gap-1.5 pt-1 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setSelectedTemplate('empty');
              }}
              className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-2.5 py-1 text-[10px] bg-indigo-500 text-white rounded hover:bg-indigo-600 font-medium cursor-pointer"
            >
              Oluştur
            </button>
          </div>
        </form>
      )}

      {/* Scrollable File Items */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Pinned Section */}
        {pinnedFiles.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold px-3 tracking-widest uppercase flex items-center gap-1.5">
              <Pin size={10} className="text-zinc-505" /> Sabitlenenler
            </span>
            <div className="space-y-0.5">
              <SortableContext items={pinnedFiles.map(f => `file:${f.id}`)} strategy={verticalListSortingStrategy}>
                {pinnedFiles.map((file) => (
                  <SortableFileItem
                    key={file.id}
                    file={file}
                    isActive={file.id === activeFileId}
                    onSelect={setActiveFileId}
                    onUpdateFile={onUpdateFile}
                    onDeleteFile={onDeleteFile}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        )}

        {/* All Files Section */}
        <div className="space-y-1">
          {pinnedFiles.length > 0 && unpinnedFiles.length > 0 && (
            <span className="text-[10px] text-zinc-500 font-bold px-3 tracking-widest uppercase block mt-2">
              Tüm Dosyalar
            </span>
          )}
          <div className="space-y-0.5">
            <SortableContext items={unpinnedFiles.map(f => `file:${f.id}`)} strategy={verticalListSortingStrategy}>
              {unpinnedFiles.map((file) => (
                <SortableFileItem
                  key={file.id}
                  file={file}
                  isActive={file.id === activeFileId}
                  onSelect={setActiveFileId}
                  onUpdateFile={onUpdateFile}
                  onDeleteFile={onDeleteFile}
                />
              ))}
            </SortableContext>
            {pinnedFiles.length === 0 && unpinnedFiles.length === 0 && (
              <div className="text-center py-12 text-[11px] text-zinc-650">
                <Settings2 size={20} className="mx-auto mb-2 text-zinc-700 stroke-[1.5]" />
                <span>Eşleşen dosya bulunamadı.</span>
              </div>
            )}
          </div>
        </div>

        {/* Archived Files Section */}
        {archivedFilteredFiles.length > 0 && (
          <div className="space-y-1 mt-4 pt-4 border-t border-zinc-850/50">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-350 hover:bg-zinc-800/10 rounded-md transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-[10px]">
                <Archive size={12} className="text-zinc-650" /> Arşivlenmiş Dosyalar ({archivedFilteredFiles.length})
              </span>
              <ChevronDown size={14} className={`transform transition-transform ${showArchived ? 'rotate-180' : ''}`} />
            </button>
            
            {showArchived && (
              <div className="space-y-0.5 mt-2">
                {archivedFilteredFiles.map((file) => (
                  <SortableFileItem
                    key={file.id}
                    file={file}
                    isActive={file.id === activeFileId}
                    onSelect={setActiveFileId}
                    onUpdateFile={onUpdateFile}
                    onDeleteFile={onDeleteFile}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
