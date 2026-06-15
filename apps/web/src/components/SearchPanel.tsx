import React, { useState, useEffect } from 'react';
import { searchFiles } from '../api/files';
import { DevFile } from '../types';
import { Search, X, Folder, FileText, CornerDownRight } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';

interface SearchResultItem extends DevFile {
  project: {
    id: string;
    name: string;
    color: string;
  };
}

export const SearchPanel: React.FC = () => {
  const { searchQuery, setSearchQuery, setActiveProjectId, setActiveFileId } = useUiStore();
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchFiles(searchQuery);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  if (!searchQuery) return null;

  const handleSelectResult = (result: SearchResultItem) => {
    setActiveProjectId(result.project.id);
    setActiveFileId(result.id);
    setSearchQuery(''); // close search panel
  };

  return (
    <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[70vh] overflow-hidden">
        {/* Search Input in modal */}
        <div className="p-4 border-b border-zinc-850 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search className="text-zinc-500 shrink-0" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-zinc-150 placeholder-zinc-500 focus:outline-none w-full"
              placeholder="Başlık veya içerikte ara..."
              autoFocus
            />
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 text-zinc-550 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
              Aranıyor...
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectResult(item)}
                className="group p-3 hover:bg-zinc-805 border border-transparent hover:border-zinc-750 rounded-lg cursor-pointer transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="text-zinc-500 shrink-0 mt-0.5" size={16} />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 block group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-zinc-550 line-clamp-1 mt-0.5">
                      {item.content ? item.content.slice(0, 100) : 'Boş dosya'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold"
                    style={{
                      color: item.project.color,
                      borderColor: `${item.project.color}20`,
                      backgroundColor: `${item.project.color}05`,
                    }}
                  >
                    <Folder size={10} style={{ color: item.project.color }} />
                    {item.project.name}
                  </div>
                  <CornerDownRight size={14} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-zinc-600">
              Arama sorgunuzla eşleşen sonuç bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
